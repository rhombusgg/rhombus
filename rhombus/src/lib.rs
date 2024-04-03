#![forbid(unsafe_code)]

mod account;
pub mod auth;
pub mod backend_libsql;
pub mod backend_postgres;
mod challenges;
mod command_palette;
pub mod database;
pub mod locales;
mod open_graph;
pub mod plugin;
mod track;

use anyhow::anyhow;
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
use std::{env, net::SocketAddr, sync::Arc};
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

use crate::{
    backend_libsql::LibSQL, backend_postgres::Postgres, database::Database, locales::Localizations,
};

#[derive(Default)]
pub struct Builder<'a> {
    plugins: Vec<&'a (dyn Plugin + Sync)>,
    database: Option<DbConfig>,
    jwt_secret: Option<String>,
    discord_client_id: Option<String>,
    discord_client_secret: Option<String>,
    discord_bot_token: Option<String>,
    discord_guild_id: Option<String>,
    location_url: Option<String>,
}

pub enum DbConfig {
    Url(String),
    LibSQL(String, String),
    RawPostgres(PgPool),
    RawLibSQL(libsql::Connection),
}

impl From<String> for DbConfig {
    fn from(value: String) -> Self {
        Self::Url(value)
    }
}

impl From<&str> for DbConfig {
    fn from(value: &str) -> Self {
        Self::Url(value.to_owned())
    }
}

impl From<PgPool> for DbConfig {
    fn from(value: PgPool) -> Self {
        Self::RawPostgres(value)
    }
}

impl From<libsql::Connection> for DbConfig {
    fn from(value: libsql::Connection) -> Self {
        Self::RawLibSQL(value)
    }
}

impl From<(&str, &str)> for DbConfig {
    fn from(value: (&str, &str)) -> Self {
        Self::LibSQL(value.0.to_owned(), value.1.to_owned())
    }
}

impl From<(String, String)> for DbConfig {
    fn from(value: (String, String)) -> Self {
        Self::LibSQL(value.0, value.1)
    }
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

impl<'a> Builder<'a> {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn load_env(self) -> Self {
        let database = if let Ok(database_url) = env::var("DATABASE_URL") {
            Some(database_url.into())
        } else if let (Ok(libsql_url), Ok(libsql_auth_token)) =
            (env::var("LIBSQL_URL"), env::var("LIBSQL_AUTH_TOKEN"))
        {
            Some((libsql_url, libsql_auth_token).into())
        } else {
            self.database
        };

        Self {
            location_url: env::var("LOCATION_URL")
                .map(|x| Some(x))
                .unwrap_or(self.location_url),
            discord_client_id: env::var("DISCORD_CLIENT_ID")
                .map(|x| Some(x))
                .unwrap_or(self.discord_client_id),
            discord_client_secret: env::var("DISCORD_CLIENT_SECRET")
                .map(|x| Some(x))
                .unwrap_or(self.discord_client_secret),
            discord_bot_token: env::var("DISCORD_TOKEN")
                .map(|x| Some(x))
                .unwrap_or(self.discord_bot_token),
            discord_guild_id: env::var("DISCORD_GUILD_ID")
                .map(|x| Some(x))
                .unwrap_or(self.discord_guild_id),
            jwt_secret: env::var("JWT_SECRET")
                .map(|x| Some(x))
                .unwrap_or(self.jwt_secret),
            database,
            ..self
        }
    }

    pub fn jwt_secret(self, jwt_secret: impl Into<String>) -> Self {
        Self {
            jwt_secret: Some(jwt_secret.into()),
            ..self
        }
    }

    pub fn location_url(self, location_url: impl Into<String>) -> Self {
        Self {
            location_url: Some(location_url.into()),
            ..self
        }
    }

    pub fn database(self, database: DbConfig) -> Self {
        Self {
            database: Some(database),
            ..self
        }
    }

    pub fn plugin(self, plugin: &'a (impl Plugin + Sync)) -> Self {
        let mut plugins = self.plugins;
        plugins.push(plugin);

        Self { plugins, ..self }
    }

    async fn build_database(&self) -> anyhow::Result<Connection> {
        if let Some(database_config) = &self.database {
            match database_config {
                DbConfig::LibSQL(url, auth_token) => {
                    let database = LibSQL::new_remote(url, auth_token).await?;
                    database.migrate().await?;

                    for plugin in self.plugins.clone().iter() {
                        plugin.migrate_libsql(database.clone()).await?;
                    }

                    Ok(Arc::new(database))
                }
                DbConfig::RawPostgres(pool) => {
                    let database = Postgres::new(pool.to_owned());
                    database.migrate().await?;

                    for plugin in self.plugins.clone().iter() {
                        plugin.migrate_postgresql(database.clone()).await?;
                    }

                    Ok(Arc::new(database))
                }
                DbConfig::RawLibSQL(connection) => {
                    let database: LibSQL = connection.to_owned().into();
                    database.migrate().await?;

                    for plugin in self.plugins.clone().iter() {
                        plugin.migrate_libsql(database.clone()).await?;
                    }

                    Ok(Arc::new(database))
                }
                DbConfig::Url(database_url) => {
                    if database_url.starts_with("postgres://") {
                        let pool = PgPoolOptions::new().connect(&database_url).await?;
                        let database = Postgres::new(pool);
                        database.migrate().await?;

                        for plugin in self.plugins.clone().iter() {
                            plugin.migrate_postgresql(database.clone()).await?;
                        }

                        return Ok(Arc::new(database));
                    }

                    if database_url.starts_with("file://") {
                        let (_, path) = database_url.split_at(7);
                        let database = LibSQL::new_local(path).await?;
                        database.migrate().await?;

                        for plugin in self.plugins.clone().iter() {
                            plugin.migrate_libsql(database.clone()).await?;
                        }

                        return Ok(Arc::new(database));
                    }

                    Err(anyhow!("Unkown database scheme in url {database_url}"))
                }
            }
        } else {
            info!("Falling back to in memory database");

            let database = LibSQL::new_memory().await?;
            database.migrate().await?;

            for plugin in self.plugins.clone().iter() {
                plugin.migrate_libsql(database.clone()).await?;
            }

            Ok(Arc::new(database))
        }
    }

    pub async fn build(&self) -> anyhow::Result<Router> {
        let config = Config {
            jwt_secret: self
                .jwt_secret
                .clone()
                .ok_or(anyhow!("JWT Secret is required!"))?,
            discord_client_id: self
                .discord_client_id
                .clone()
                .ok_or(anyhow!("Discord Client ID is required!"))?,
            discord_client_secret: self
                .discord_client_secret
                .clone()
                .ok_or(anyhow!("Discord Client Secret is required!"))?,
            discord_bot_token: self
                .discord_bot_token
                .clone()
                .ok_or(anyhow!("Discord Bot Token is required!"))?,
            discord_guild_id: self
                .discord_guild_id
                .clone()
                .ok_or(anyhow!("Discord Guild ID is required!"))?,
            location_url: self
                .location_url
                .clone()
                .ok_or(anyhow!("Location URL is required!"))?,
        };

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
            config: config.clone(),
            discord_signin_url: format!(
                "https://discord.com/api/oauth2/authorize?client_id={}&redirect_uri={}&response_type=code&scope=identify+guilds.join",
                config.discord_client_id,
                format!("{}/signin/discord", config.location_url)
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
