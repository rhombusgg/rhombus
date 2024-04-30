use std::{env, sync::Arc};

use axum::{
    http::StatusCode,
    middleware,
    response::{Html, IntoResponse},
    routing::get,
    Router,
};
use tower_governor::{governor::GovernorConfigBuilder, GovernorLayer};
use tower_http::{compression::CompressionLayer, services::ServeDir};
use tracing::{debug, info};

use crate::{
    errors::{DatabaseConfigurationError, RhombusError},
    internal::{
        account::route_account,
        auth::{
            auth_injector_middleware, enforce_auth_middleware, route_discord_callback,
            route_signin, route_signout,
        },
        cache_layer::DbCache,
        challenges::route_challenges,
        database::Database,
        home::route_home,
        ip::{
            default_ip_extractor, ip_insert_blank_middleware, ip_insert_middleware,
            maybe_cf_connecting_ip, maybe_fly_client_ip, maybe_peer_ip,
            maybe_rightmost_x_forwarded_for, maybe_true_client_ip, maybe_x_real_ip,
            track_middleware, KeyExtractorShim,
        },
        locales::{self, translate},
        open_graph::route_default_og_image,
        router::RouterStateInner,
        settings::IpPreset,
        team::route_team,
    },
    Plugin,
};

use crate::{
    internal::{
        database::Connection,
        ip::IpExtractorFn,
        settings::{DbConfig, Settings},
    },
    Result,
};

static STATIC_DIR: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/static");

/// A builder to make an axum router
#[derive(Default)]
pub struct Builder {
    pub plugins: Vec<Box<dyn Plugin + Send + Sync>>,
    pub database: Option<DbConfig>,
    pub config_builder: config::ConfigBuilder<config::builder::DefaultState>,
    pub ip_extractor: Option<IpExtractorFn>,
}

impl Builder {
    pub fn load_env(self) -> Self {
        _ = dotenvy::dotenv();
        self
    }

    /// Choose a client IP extractor for your environment
    /// Read more about doing this securely: <https://adam-p.ca/blog/2022/03/x-forwarded-for>
    pub fn extractor(self, ip_extractor: IpExtractorFn) -> Self {
        Self {
            ip_extractor: Some(ip_extractor),
            ..self
        }
    }

    #[cfg(feature = "shuttle")]
    /// Treat Shuttle's secrets as environment variables to configure Rhombus with.
    ///
    /// ```ignore
    /// #[shuttle_runtime::main]
    /// async fn main(
    ///     #[shuttle_runtime::Secrets] secrets: shuttle_runtime::SecretStore,
    /// ) -> shuttle_axum::ShuttleAxum {
    ///     let app = rhombus::Builder::default()
    ///         .config_from_shuttle(secrets.into_iter())
    ///         // continue configuring rhombus...
    /// }
    /// ```
    pub fn config_from_shuttle(self, secrets_iter: impl Iterator<Item = (String, String)>) -> Self {
        for item in secrets_iter {
            let (key, value) = item;
            if env::var(&key).is_err() {
                env::set_var(&key, value);
            }
        }

        self
    }

    pub fn config_source<T>(self, source: T) -> Self
    where
        T: config::Source + Send + Sync + 'static,
    {
        Self {
            config_builder: self.config_builder.add_source(source),
            ..self
        }
    }

    /// Override a specific config value programatically.
    ///
    /// ```
    /// rhombus::Builder::default()
    ///    .config_override("location_url", "http://localhost:3000")
    ///     # ;
    /// ```
    pub fn config_override<S, T>(self, key: S, value: T) -> Self
    where
        S: AsRef<str>,
        T: Into<config::Value>,
    {
        Self {
            config_builder: self.config_builder.set_override(key, value).unwrap(),
            ..self
        }
    }

    pub fn database(self, database: DbConfig) -> Self {
        Self {
            database: Some(database),
            ..self
        }
    }

    pub fn plugin(self, plugin: impl Plugin + Send + Sync + 'static) -> Self {
        let mut plugins = self.plugins;
        plugins.push(Box::new(plugin));

        Self { plugins, ..self }
    }

    async fn build_database(&self, settings: &Settings) -> Result<Connection> {
        if let Some(database_config) = &self.database {
            match database_config {
                #[cfg(feature = "postgres")]
                DbConfig::RawPostgres(pool) => {
                    info!("Using user preconfigured postgres");
                    let database =
                        crate::internal::backend_postgres::Postgres::new(pool.to_owned());
                    database.migrate().await?;

                    for plugin in self.plugins.iter() {
                        plugin.migrate_postgresql(database.clone()).await?;
                    }

                    return Ok(Arc::new(database));
                }

                #[cfg(feature = "libsql")]
                DbConfig::RawLibSQL(connection) => {
                    info!("Using user preconfigured libsql connection");
                    let database: crate::internal::backend_libsql::LibSQL =
                        connection.to_owned().into();
                    database.migrate().await?;

                    for plugin in self.plugins.iter() {
                        plugin.migrate_libsql(database.clone()).await?;
                    }

                    return Ok(Arc::new(database));
                }
            }
        }

        if let Some(database_url) = &settings.database_url {
            if database_url.starts_with("postgres://") {
                #[cfg(not(feature = "postgres"))]
                return Err(DatabaseConfigurationError::MissingFeature(
                    "postgres".to_owned(),
                    database_url.to_owned(),
                )
                .into());

                #[cfg(feature = "postgres")]
                {
                    info!("Connecting to postgres database from database url");
                    let pool = sqlx::postgres::PgPoolOptions::new()
                        .connect(database_url)
                        .await?;
                    let database = crate::internal::backend_postgres::Postgres::new(pool);
                    database.migrate().await?;

                    for plugin in self.plugins.iter() {
                        plugin.migrate_postgresql(database.clone()).await?;
                    }

                    return Ok(Arc::new(database));
                }
            }

            if let Some(path) = database_url.strip_prefix("file://") {
                #[cfg(not(feature = "libsql"))]
                {
                    _ = path;
                    return Err(DatabaseConfigurationError::MissingFeature(
                        "libsql".to_owned(),
                        database_url.to_owned(),
                    )
                    .into());
                }

                #[cfg(feature = "libsql")]
                {
                    info!("Connecting to local file libsql database from database url");
                    let database = crate::internal::backend_libsql::LibSQL::new_local(path).await?;
                    database.migrate().await?;

                    for plugin in self.plugins.iter() {
                        plugin.migrate_libsql(database.clone()).await?;
                    }

                    return Ok(Arc::new(database));
                }
            }

            if database_url.strip_prefix("libsql://").is_some() {
                #[cfg(not(feature = "libsql"))]
                {
                    _ = path;
                    return Err(DatabaseConfigurationError::MissingFeature(
                        "libsql".to_owned(),
                        database_url.to_owned(),
                    )
                    .into());
                }

                if let Some(turso) = &settings.turso {
                    #[cfg(feature = "libsql")]
                    {
                        let database = if let Some(local_replica_path) = &turso.local_replica_path {
                            info!("Connecting to remote libsql database with local replica from database url");
                            crate::internal::backend_libsql::LibSQL::new_remote_replica(
                                local_replica_path,
                                database_url.to_owned(),
                                turso.auth_token.to_owned(),
                            )
                            .await?
                        } else {
                            info!("Connecting to remote libsql database from database url");
                            crate::internal::backend_libsql::LibSQL::new_remote(
                                database_url.to_owned(),
                                turso.auth_token.to_owned(),
                            )
                            .await?
                        };
                        database.migrate().await?;

                        for plugin in self.plugins.iter() {
                            plugin.migrate_libsql(database.clone()).await?;
                        }

                        return Ok(Arc::new(database));
                    }
                } else {
                    return Err(RhombusError::MissingConfiguration(format!(
                        "libsql.auth_token must be set for url {}",
                        database_url
                    )));
                }
            }

            return Err(
                DatabaseConfigurationError::UnknownUrlScheme(database_url.to_owned()).into(),
            );
        }

        #[cfg(feature = "libsql")]
        {
            tracing::warn!("Falling back to in memory database");
            let database = crate::internal::backend_libsql::LibSQL::new_memory().await?;
            database.migrate().await?;

            for plugin in self.plugins.iter() {
                plugin.migrate_libsql(database.clone()).await?;
            }
            Ok(Arc::new(database))
        }

        #[cfg(not(feature = "libsql"))]
        Err(
            DatabaseConfigurationError::MissingFeature("libsql".to_owned(), ":memory:".to_owned())
                .into(),
        )
    }

    pub async fn build(&self) -> Result<Router> {
        let settings: Settings = self
            .config_builder
            .clone()
            .add_source(config::Environment::with_prefix("rhombus").separator("__"))
            .set_default("live_reload", cfg!(debug_assertions))
            .unwrap()
            .set_default("in_memory_cache", true)
            .unwrap()
            .build()?
            .try_deserialize()?;

        let db = self.build_database(&settings).await?;
        let db = if settings.in_memory_cache {
            Arc::new(DbCache::new(db))
        } else {
            db
        };

        let mut localizer = locales::Localizations::new();
        for plugin in self.plugins.iter() {
            debug!(plugin_name = plugin.name(), "Loading");
            plugin.localize(&mut localizer.bundles)?;
        }

        let mut env = minijinja::Environment::new();
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

        let ip_extractor = self.ip_extractor.or_else(|| {
            settings.ip_preset.clone().map(|preset| match preset {
                IpPreset::RightmostXForwardedFor => {
                    info!("Selecting preset Rightmost X-Forwarded-For");
                    maybe_rightmost_x_forwarded_for
                }
                IpPreset::XRealIp => {
                    info!("Selecting preset X-Real-Ip");
                    maybe_x_real_ip
                }
                IpPreset::FlyClientIp => {
                    info!("Selecting preset Fly-Client-Ip");
                    maybe_fly_client_ip
                }
                IpPreset::TrueClientIp => {
                    info!("Selecting preset True-Client-Ip");
                    maybe_true_client_ip
                }
                IpPreset::CFConnectingIp => {
                    info!("Selecting preset CF-Connecting-IP");
                    maybe_cf_connecting_ip
                }
                IpPreset::PeerIp => {
                    info!("Selecting preset peer ip");
                    maybe_peer_ip
                }
            })
        });

        let router_state = Arc::new(RouterStateInner {
            db,
            jinja: env,
            settings: Arc::new(settings.clone()),
            ip_extractor: ip_extractor.unwrap_or(default_ip_extractor),
        });

        let mut plugin_router = Router::new();
        for plugin in self.plugins.iter() {
            plugin_router = plugin_router.merge(plugin.routes(router_state.clone()));
        }

        let rhombus_router = Router::new()
            .fallback(handler_404)
            .route("/account", get(route_account))
            .route("/team", get(route_team))
            .route_layer(middleware::from_fn(enforce_auth_middleware))
            .nest_service("/static", ServeDir::new(STATIC_DIR))
            .route("/", get(route_home))
            .route("/challenges", get(route_challenges))
            .route("/signout", get(route_signout))
            .route("/signin", get(route_signin))
            .route("/signin/discord", get(route_discord_callback))
            .route("/og-image.png", get(route_default_og_image))
            .with_state(router_state.clone());

        let router = if !self.plugins.is_empty() {
            Router::new()
                .fallback_service(rhombus_router)
                .nest("/", plugin_router)
        } else {
            rhombus_router
        };

        let router = router
            .layer(middleware::from_fn(locales::locale_middleware))
            .layer(middleware::from_fn_with_state(
                router_state.clone(),
                track_middleware,
            ))
            .layer(middleware::from_fn_with_state(
                router_state.clone(),
                auth_injector_middleware,
            ));

        let router = if ip_extractor.is_some() {
            router.layer(middleware::from_fn_with_state(
                router_state.clone(),
                ip_insert_middleware,
            ))
        } else {
            router.layer(middleware::from_fn(ip_insert_blank_middleware))
        };

        let router =
            if let (Some(ip_extractor), Some(ratelimit)) = (ip_extractor, settings.ratelimit) {
                let per_millisecond = ratelimit.per_millisecond.unwrap_or(500);
                let burst_size = ratelimit.burst_size.unwrap_or(8);
                info!(per_millisecond, burst_size, "Setting ratelimit");

                let governor_conf = Arc::new(
                    GovernorConfigBuilder::default()
                        .per_millisecond(per_millisecond)
                        .burst_size(burst_size)
                        .key_extractor(KeyExtractorShim::new(ip_extractor))
                        .use_headers()
                        .finish()
                        .unwrap(),
                );

                router.layer(GovernorLayer {
                    config: governor_conf,
                })
            } else {
                router
            };

        let router = if settings.live_reload {
            router.layer(
                tower_livereload::LiveReloadLayer::new().request_predicate(not_htmx_predicate),
            )
        } else {
            router
        };

        let router = router.layer(CompressionLayer::new());

        Ok(router)
    }
}

fn not_htmx_predicate<T>(req: &axum::http::Request<T>) -> bool {
    !req.headers().contains_key("hx-request")
}

async fn handler_404() -> impl IntoResponse {
    (StatusCode::NOT_FOUND, Html("404"))
}
