#![forbid(unsafe_code)]

mod account;
pub mod auth;
mod challenges;
mod command_palette;
pub mod database;
pub mod locales;
mod open_graph;
pub mod plugin;
pub mod postgresql;
mod track;

use anyhow::bail;
use axum::{
    extract::State,
    http::{StatusCode, Uri},
    middleware,
    response::{Html, IntoResponse},
    routing::get,
    Extension, Router,
};
use database::Connection;
use minijinja::{context, Environment};
use sqlx::{postgres::PgPoolOptions, PgPool};
use std::{net::SocketAddr, sync::Arc};
use tokio::net::{TcpListener, ToSocketAddrs};
use tower_governor::{governor::GovernorConfigBuilder, GovernorLayer};
use tower_http::{compression::CompressionLayer, services::ServeDir};
use tracing::{debug, info};

use account::route_account;
use auth::{
    auth_injector_middleware, enforce_auth_middleware, route_discord_callback, route_signin,
    route_signout, MaybeClientUser,
};
use challenges::route_challenges;
use command_palette::route_command_palette;
use locales::{translate, Lang};
use open_graph::route_default_og_image;
use plugin::Plugin;
use track::track;

use crate::{database::Database, locales::Localizations, postgresql::Postgres};

pub struct Rhombus<'a> {
    database_url: Option<String>,
    config: Config,
    plugins: Vec<&'a (dyn Plugin + Sync)>,
    pgpool: Option<PgPool>,
}

#[derive(Clone)]
pub struct Config {
    pub jwt_secret: String,
    pub discord_client_id: String,
    pub discord_client_secret: String,
    pub discord_bot_token: String,
    pub discord_guild_id: String,
    pub location_url: String,
}

pub type RhombusRouterState = Arc<RhombusRouterStateInner>;

pub struct RhombusRouterStateInner {
    pub db: Connection,
    pub jinja: Environment<'static>,
    pub config: Config,
    pub discord_signin_url: String,
}

async fn handler_404() -> impl IntoResponse {
    (StatusCode::NOT_FOUND, Html("404"))
}

static STATIC_DIR: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/static");

impl<'a> Rhombus<'a> {
    pub fn new(config: Config) -> Self {
        Self {
            config,
            database_url: None,
            plugins: Vec::new(),
            pgpool: None,
        }
    }

    pub fn plugin(self, plugin: &'a (impl Plugin + Sync)) -> Self {
        let mut plugins = self.plugins;
        plugins.push(plugin);

        Self { plugins, ..self }
    }

    pub fn connect_from_url(self, url: &str) -> Self {
        Self {
            database_url: Some(url.to_owned()),
            ..self
        }
    }

    pub fn pgpool(self, pool: sqlx::PgPool) -> Self {
        Self {
            pgpool: Some(pool),
            ..self
        }
    }

    async fn build_database(&self) -> anyhow::Result<Connection> {
        // The user may have provided a raw sqlx PgPool
        if let Some(pool) = self.pgpool.clone() {
            let postgres = Postgres::new(pool);
            postgres.migrate().await?;

            for plugin in self.plugins.clone().iter() {
                plugin.migrate_postgresql(postgres.clone()).await?;
            }

            return Ok(Arc::new(postgres));
        }

        // A plugin may have a complete database override. We should take
        // the last one implements one.
        for plugin in self.plugins.clone().iter().rev() {
            if let Ok(Some(db)) = plugin.database().await {
                debug!(plugin_name = plugin.name(), "Using plugin database backend");
                return Ok(db);
            }
        }

        // Otherwise, try to figure out the database from the url
        let Some(database_url) = &self.database_url else {
            bail!("Database needs to be set");
        };

        if database_url.starts_with("postgres://") {
            let pool = PgPoolOptions::new().connect(database_url).await?;
            let postgres = Postgres::new(pool);
            postgres.migrate().await?;

            for plugin in self.plugins.clone().iter() {
                plugin.migrate_postgresql(postgres.clone()).await?;
            }

            return Ok(Arc::new(postgres));
        }

        bail!("Unkown database scheme in url {database_url}");
    }

    pub async fn build(&self) -> anyhow::Result<Router> {
        let db = self.build_database().await?;

        let mut localizer = Localizations::new();
        for plugin in self.plugins.clone().iter() {
            debug!(plugin_name = plugin.name(), "Loading");
            plugin.localize(&mut localizer.bundles)?;
        }

        let mut env = Environment::new();
        minijinja_embed::load_templates!(&mut env);

        env.add_function(
            "_",
            move |msg_id: &str, kwargs: minijinja::value::Kwargs, state: &minijinja::State| {
                translate(&localizer, msg_id, kwargs, state)
            },
        );

        for plugin in self.plugins.iter() {
            plugin.theme(&mut env)?;
        }

        let router_state = Arc::new(RhombusRouterStateInner {
            db,
            jinja: env,
            config: self.config.clone(),
            discord_signin_url: format!(
                "https://discord.com/api/oauth2/authorize?client_id={}&redirect_uri={}&response_type=code&scope=identify+guilds.join",
                self.config.discord_client_id,
                format!("{}/signin/discord", self.config.location_url)
            ),
        });

        let mut plugin_router = Router::new();
        for plugin in self.plugins.iter() {
            plugin_router = plugin_router.merge(plugin.routes(router_state.clone()));
        }

        let rhombus_router = Router::new()
            .fallback(handler_404)
            .route("/account", get(route_account))
            .route_layer(middleware::from_fn(enforce_auth_middleware))
            .nest_service("/static", ServeDir::new(STATIC_DIR))
            .route("/", get(route_home))
            .route("/challenges", get(route_challenges))
            .route("/modal", get(route_command_palette))
            .route("/signout", get(route_signout))
            .route("/signin", get(route_signin))
            .route("/signin/discord", get(route_discord_callback))
            .route("/og-image.png", get(route_default_og_image))
            .with_state(router_state.clone());

        let router = if self.plugins.is_empty() {
            rhombus_router
        } else {
            Router::new()
                .fallback_service(rhombus_router)
                .nest("/", plugin_router)
        };

        let governor_conf = Box::new(
            GovernorConfigBuilder::default()
                .per_second(1)
                .burst_size(50)
                .use_headers()
                .finish()
                .unwrap(),
        );

        let router = router
            .layer(middleware::from_fn(locales::locale))
            .layer(middleware::from_fn_with_state(router_state.clone(), track))
            .layer(middleware::from_fn_with_state(
                router_state.clone(),
                auth_injector_middleware,
            ))
            .layer(GovernorLayer {
                config: Box::leak(governor_conf),
            });

        #[cfg(debug_assertions)]
        let router = router
            .layer(tower_livereload::LiveReloadLayer::new().request_predicate(not_htmx_predicate));

        let router = router.layer(CompressionLayer::new());

        Ok(router)
    }
}

#[cfg(debug_assertions)]
fn not_htmx_predicate<T>(req: &axum::http::Request<T>) -> bool {
    !req.headers().contains_key("hx-request")
}

pub async fn serve(router: Router, address: impl ToSocketAddrs) -> Result<(), std::io::Error> {
    #[cfg(debug_assertions)]
    let listener = match listenfd::ListenFd::from_env().take_tcp_listener(0).unwrap() {
        Some(listener) => {
            tracing::debug!("restored socket from listenfd");
            listener.set_nonblocking(true).unwrap();
            TcpListener::from_std(listener).unwrap()
        }
        None => TcpListener::bind(address).await.unwrap(),
    };

    #[cfg(not(debug_assertions))]
    let listener = TcpListener::bind(address).await.unwrap();

    info!(
        address = listener.local_addr().unwrap().to_string(),
        "listening on"
    );
    axum::serve(
        listener,
        router.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await?;

    Ok(())
}

async fn route_home(
    State(state): State<RhombusRouterState>,
    Extension(user): Extension<MaybeClientUser>,
    Extension(lang): Extension<Lang>,
    uri: Uri,
) -> Html<String> {
    Html(
        state
            .jinja
            .get_template("home.html")
            .unwrap()
            .render(context! {
                lang => lang,
                user => user,
                uri => uri.to_string(),
                location_url => state.config.location_url,
                discord_signin_url => &state.discord_signin_url,
                og_image => format!("{}/og-image.png", state.config.location_url)
            })
            .unwrap(),
    )
}
