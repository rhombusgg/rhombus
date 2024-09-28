use std::{
    any::Any,
    fmt::Debug,
    hash::{BuildHasher, BuildHasherDefault, Hasher},
    num::NonZeroU32,
    sync::Arc,
};

use axum::{
    http::StatusCode,
    middleware,
    response::{Html, IntoResponse},
    routing::{delete, get, post},
    Extension,
};
use tokio::sync::{Mutex, RwLock};
use tower_governor::{governor::GovernorConfigBuilder, GovernorLayer};
use tower_http::compression::CompressionLayer;
use tracing::info;

use crate::{
    database_upload_provider::DatabaseUploadProvider,
    errors::{DatabaseConfigurationError, RhombusError},
    internal::{
        auth::{
            auth_injector_middleware, enforce_admin_middleware, enforce_auth_middleware,
            route_signin, route_signin_credentials, route_signin_ctftime,
            route_signin_ctftime_callback, route_signin_discord, route_signin_discord_callback,
            route_signin_email, route_signin_email_callback, route_signin_email_confirm_callback,
            route_signout,
        },
        command_palette::route_command_palette_items,
        database::{
            cache::{database_cache_evictor, DbCache},
            provider::{Connection, Database},
        },
        discord::Bot,
        division::{
            Division, DivisionEligibilityProvider, EmailDivisionEligibilityProvider,
            MaxDivisionPlayers, OpenDivisionEligibilityProvider,
        },
        email::{
            imap::ImapEmailReciever, mailgun::MailgunProvider, outbound_mailer::OutboundMailer,
            provider::InboundEmail, smtp::SmtpProvider,
        },
        health::{healthcheck_catch_up, healthcheck_runner},
        ip::{
            default_ip_extractor, ip_insert_blank_middleware, ip_insert_middleware,
            maybe_cf_connecting_ip, maybe_fly_client_ip, maybe_peer_ip,
            maybe_rightmost_x_forwarded_for, maybe_true_client_ip, maybe_x_real_ip, track_flusher,
            track_middleware, IpExtractorFn, KeyExtractorShim,
        },
        locales::{self, jinja_timediff, jinja_translate, locale_middleware},
        open_graph::{
            open_graph_cache_evictor, route_default_og_image, route_team_og_image,
            route_user_og_image,
        },
        router::{route_reload, RouterState, RouterStateInner},
        routes::{
            account::{
                discord_cache_evictor, route_account, route_account_add_email,
                route_account_delete_email, route_account_email_verify_callback,
                route_account_email_verify_confirm, route_account_set_name,
            },
            challenges::{
                route_challenge_submit, route_challenge_view, route_challenges,
                route_ticket_submit, route_ticket_view, route_writeup_delete, route_writeup_submit,
            },
            home::route_home,
            meta::{page_meta_middleware, route_robots_txt, GlobalPageMeta},
            public::{route_public_team, route_public_user},
            scoreboard::{
                route_scoreboard, route_scoreboard_division, route_scoreboard_division_ctftime,
            },
            team::{
                route_team, route_team_roll_token, route_team_set_division, route_team_set_name,
                route_user_kick,
            },
            terms::route_terms,
        },
        settings::{DbConfig, IpPreset, Settings},
        static_serve::route_static_serve,
        templates::Templates,
    },
    plugin::{DatabaseProviderContext, RunContext, UploadProviderContext},
    s3_upload_provider::S3UploadProvider,
    upload_provider::UploadProvider,
    LocalUploadProvider, Plugin, Result,
};

pub enum RawDb {
    #[cfg(feature = "postgres")]
    Postgres(Arc<crate::internal::database::postgres::Postgres>),

    #[cfg(feature = "libsql")]
    LibSQL(Arc<crate::internal::database::libsql::LibSQL>),

    Plugin(Box<dyn Any + Send + Sync>),
}

pub fn builder() -> Builder<(), ()> {
    Builder::default()
}

/// Build a Rhombus application.
///
/// ## Order of execution
///
/// 1. Load settings and configuration from file
/// 2. Connect to database and execute migrations
/// 3. Load settings from database (if mutable configuration is enabled)
/// 4. Execute plugins
/// 5. Merge routers and return the final router
pub struct Builder<P: Plugin + Send + Sync + 'static, U: UploadProvider + Send + Sync + 'static> {
    pub plugins: P,
    pub num_plugins: u32,
    pub database: Option<DbConfig>,
    pub upload_provider: Option<U>,
    pub config_builder: config::ConfigBuilder<config::builder::DefaultState>,
    pub ip_extractor: Option<IpExtractorFn>,
}

impl Default for Builder<(), ()> {
    fn default() -> Builder<(), ()> {
        Builder {
            plugins: (),
            num_plugins: 0,
            database: None,
            upload_provider: None,
            config_builder: config::ConfigBuilder::<config::builder::DefaultState>::default(),
            ip_extractor: None,
        }
    }
}

impl<P: Plugin + Send + Sync + 'static, U: UploadProvider + Send + Sync + 'static> Debug
    for Builder<P, U>
{
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Builder")
            .field("ip_extractor", &"...")
            .finish()
    }
}

impl<P: Plugin + Send + Sync + 'static, U: UploadProvider + Send + Sync + 'static> Builder<P, U> {
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
            if std::env::var(&key).is_err() {
                std::env::set_var(&key, value);
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

    pub async fn division(self) -> Self {
        self
    }

    pub fn upload_provider<Un: UploadProvider + Send + Sync>(
        self,
        upload_provider: Un,
    ) -> Builder<P, Un> {
        Builder {
            plugins: self.plugins,
            num_plugins: self.num_plugins,
            config_builder: self.config_builder,
            database: self.database,
            ip_extractor: self.ip_extractor,
            upload_provider: Some(upload_provider),
        }
    }

    pub fn plugin<Pn>(self, plugin: Pn) -> Builder<(Pn, P), U>
    where
        Pn: Plugin + Send + Sync + 'static,
    {
        Builder {
            plugins: (plugin, self.plugins),
            num_plugins: self.num_plugins + 1,
            config_builder: self.config_builder,
            database: self.database,
            ip_extractor: self.ip_extractor,
            upload_provider: self.upload_provider,
        }
    }

    async fn build_database(&self, settings: &Settings) -> Result<(Connection, RawDb)> {
        if let Some(database_config) = &self.database {
            match database_config {
                #[cfg(feature = "postgres")]
                DbConfig::RawPostgres(pool) => {
                    info!("Using user preconfigured postgres");
                    let database = crate::internal::database::postgres::Postgres::new(pool.clone());
                    database.migrate().await?;

                    let db = Arc::new(database);
                    return Ok((db.clone(), RawDb::Postgres(db)));
                }

                #[cfg(feature = "libsql")]
                DbConfig::RawLibSQL(database) => {
                    let database =
                        crate::internal::database::libsql::RemoteLibSQL::from(database.clone());
                    database.migrate().await?;

                    let libsql_database: crate::internal::database::libsql::LibSQL =
                        database.into();
                    let db = Arc::new(libsql_database);
                    return Ok((db.clone(), RawDb::LibSQL(db)));
                }

                #[cfg(feature = "libsql")]
                DbConfig::RawLibSQLConnection(connection) => {
                    let database =
                        crate::internal::database::libsql::LocalLibSQL::from(connection.clone());
                    database.migrate().await?;

                    let libsql_database: crate::internal::database::libsql::LibSQL =
                        database.into();
                    let db = Arc::new(libsql_database);
                    return Ok((db.clone(), RawDb::LibSQL(db)));
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
                    let database = crate::internal::database::postgres::Postgres::new(pool.clone());
                    database.migrate().await?;

                    let db = Arc::new(database);
                    return Ok((db.clone(), RawDb::Postgres(db)));
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
                    info!(database_url, "Connecting to local file libsql database");
                    let database =
                        crate::internal::database::libsql::LocalLibSQL::new_local(path).await?;
                    database.migrate().await?;

                    let libsql_database: crate::internal::database::libsql::LibSQL =
                        database.into();
                    let db = Arc::new(libsql_database);
                    return Ok((db.clone(), RawDb::LibSQL(db)));
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
                            info!(
                                database_url,
                                "Connecting to remote libsql database with local replica"
                            );
                            crate::internal::database::libsql::RemoteLibSQL::new_remote_replica(
                                local_replica_path,
                                database_url.to_owned(),
                                turso.auth_token.to_owned(),
                            )
                            .await?
                        } else {
                            info!(database_url, "Connecting to remote libsql database");
                            crate::internal::database::libsql::RemoteLibSQL::new_remote(
                                database_url.to_owned(),
                                turso.auth_token.to_owned(),
                            )
                            .await?
                        };
                        database.migrate().await?;

                        let libsql_database: crate::internal::database::libsql::LibSQL =
                            database.into();
                        let db = Arc::new(libsql_database);
                        return Ok((db.clone(), RawDb::LibSQL(db)));
                    }
                } else {
                    return Err(RhombusError::MissingConfiguration(format!(
                        "libsql.auth_token must be set for url {}",
                        database_url
                    )));
                }
            }

            if database_url == ":memory:" {
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
                    info!(database_url, "Connecting to in memory libsql database");
                    let database =
                        crate::internal::database::libsql::LocalLibSQL::new_memory().await?;
                    database.migrate().await?;

                    let libsql_database: crate::internal::database::libsql::LibSQL =
                        database.into();
                    let db = Arc::new(libsql_database);
                    return Ok((db.clone(), RawDb::LibSQL(db)));
                }
            }

            return Err(
                DatabaseConfigurationError::UnknownUrlScheme(database_url.to_owned()).into(),
            );
        }

        #[cfg(feature = "libsql")]
        {
            tracing::warn!(
                database_url = "file://rhombus.db",
                "Falling back to local database"
            );
            let database =
                crate::internal::database::libsql::LocalLibSQL::new_local("rhombus.db").await?;
            database.migrate().await?;

            let libsql_database: crate::internal::database::libsql::LibSQL = database.into();
            let db = Arc::new(libsql_database);
            Ok((db.clone(), RawDb::LibSQL(db)))
        }

        #[cfg(not(feature = "libsql"))]
        Err(
            DatabaseConfigurationError::MissingFeature("libsql".to_owned(), ":memory:".to_owned())
                .into(),
        )
    }

    pub(crate) async fn build_axum_router(
        self,
        rr: Arc<crate::internal::router::Router>,
    ) -> std::result::Result<axum::Router, RhombusError> {
        let (self_arc, router) = {
            let self_arc = Arc::new(self);

            let mut settings: Settings = self_arc
                .config_builder
                .clone()
                .add_source(config::Environment::with_prefix("rhombus").separator("__"))
                .set_default("live_reload", cfg!(debug_assertions))
                .unwrap()
                .set_default("in_memory_cache", true)
                .unwrap()
                .set_default(
                    "default_ticket_template",
                    "# Describe the issue with the challenge\n\n",
                )
                .unwrap()
                .set_default("immutable_config", false)
                .unwrap()
                .build()?
                .try_deserialize()?;

            let mut database_provider_context = DatabaseProviderContext {
                settings: &mut settings,
            };

            let custom_provider = self_arc
                .plugins
                .database_provider(&mut database_provider_context)
                .await;

            let (db, rawdb) = if let Some(custom_provider) = custom_provider {
                let rawdb = RawDb::Plugin(custom_provider.1);
                let db = custom_provider.0;
                (db, rawdb)
            } else {
                self_arc.build_database(&settings).await?
            };

            let mut divisions = if let Some(divisions) = &settings.divisions {
                divisions
                    .iter()
                    .map(|division| {
                        let division_eligibility: DivisionEligibilityProvider =
                            if let Some(email_regex) = &division.email_regex {
                                Arc::new(EmailDivisionEligibilityProvider::new(
                                    email_regex,
                                    division.requirement.clone(),
                                ))
                            } else {
                                Arc::new(OpenDivisionEligibilityProvider {})
                            };

                        let id = hash(division.stable_id.as_ref().unwrap_or(&division.name));

                        let max_players = if let Some(max_players) = &division.max_players {
                            match max_players.as_str() {
                                "unlimited" => MaxDivisionPlayers::Unlimited,
                                "infinity" => MaxDivisionPlayers::Unlimited,
                                "infinite" => MaxDivisionPlayers::Unlimited,
                                "any" => MaxDivisionPlayers::Unlimited,
                                _ => {
                                    if let Ok(max_players) = max_players.parse::<NonZeroU32>() {
                                        MaxDivisionPlayers::Limited(max_players)
                                    } else {
                                        tracing::error!(
                                            max_players,
                                            division = division.name,
                                            "Invalid max players value. Defaulting to unlimited."
                                        );
                                        MaxDivisionPlayers::Unlimited
                                    }
                                }
                            }
                        } else {
                            MaxDivisionPlayers::Unlimited
                        };

                        Division {
                            id,
                            name: division.name.clone(),
                            description: division.description.clone(),
                            max_players,
                            division_eligibility,
                        }
                    })
                    .collect()
            } else {
                let name = "Open".to_owned();
                let id = hash(&name);
                vec![Division {
                    id,
                    name,
                    description: "Open division for everyone".to_owned(),
                    max_players: MaxDivisionPlayers::Unlimited,
                    division_eligibility: Arc::new(OpenDivisionEligibilityProvider {}),
                }]
            };

            let cached_db = match settings.in_memory_cache.as_str() {
                "false" => {
                    info!("Disabling in memory cache");
                    db.clone()
                }
                "true" => {
                    let duration = 360;
                    info!(duration, "Enabling default in memory cache");
                    database_cache_evictor(duration);
                    Arc::new(DbCache::new(db.clone()))
                }
                duration => {
                    if let Ok(duration) = duration.parse::<u64>() {
                        if duration >= 5 {
                            info!(duration, "Enabling default in memory cache");
                            database_cache_evictor(duration);
                            Arc::new(DbCache::new(db.clone()))
                        } else {
                            info!(
                                duration,
                                "Invalid in memory cache duration value, disabling in memory cache"
                            );
                            db.clone()
                        }
                    } else {
                        info!(
                            duration,
                            "Invalid in memory cache duration value, disabling in memory cache"
                        );
                        db.clone()
                    }
                }
            };

            open_graph_cache_evictor(20);

            let mut localizer = locales::Localizations::new();

            let mut templates = Templates::new();

            match (
                find_image_file("static/logo"),
                find_image_file("static/logo-dark"),
            ) {
                (Some(logo), Some(logo_dark)) => {
                    tracing::info!(light=?logo, dark=?logo_dark, "Using custom logo");
                    templates.set_template(
                        "logo.html",
                        &format!(
                            r#"<div><img style="height: 1.75rem" class="dark:hidden" src="/{}" alt="logo"><img style="height: 1.75rem" class="hidden dark:block" src="/{}" alt="logo"></div>"#,
                            logo.to_str().unwrap(),
                            logo_dark.to_str().unwrap()
                        )
                    );
                    templates.set_template("favicon.html", &format!(
                        r#"<link rel="icon" media="(prefers-color-scheme: light)" href="/{}"><link rel="icon" media="(prefers-color-scheme: dark)" href="/{}">"#,
                        logo.to_str().unwrap(),
                        logo_dark.to_str().unwrap()
                    ));
                }
                (Some(logo), None) => {
                    tracing::info!(logo=?logo, "Using custom logo");
                    templates.set_template(
                        "logo.html",
                        &format!(
                            r#"<img style="height: 1.75rem" src="/{}" alt="logo">"#,
                            logo.to_str().unwrap()
                        ),
                    );
                    templates.set_template(
                        "favicon.html",
                        &format!(r#"<link rel="icon" href="/{}">"#, logo.to_str().unwrap()),
                    );
                }
                (None, Some(logo_dark)) => {
                    tracing::info!(logo=?logo_dark, "Using custom logo");
                    templates.set_template(
                        "logo.html",
                        &format!(
                            r#"<img style="height: 1.75rem" src="/{}" alt="logo">"#,
                            logo_dark.to_str().unwrap()
                        ),
                    );
                    templates.set_template(
                        "favicon.html",
                        &format!(
                            r#"<link rel="icon" href="/{}">"#,
                            logo_dark.to_str().unwrap()
                        ),
                    );
                }
                (None, None) => {
                    templates.set_template(
                        "logo.html",
                        r#"<img style="height: 1.75rem" src="/static/logo.svg" alt="logo">"#,
                    );
                    templates.set_template(
                        "favicon.html",
                        r#"<link rel="icon" href="/static/logo.svg">"#,
                    );
                }
            }

            match (
                find_image_file("static/favicon"),
                find_image_file("static/favicon-dark"),
            ) {
                (Some(favicon), Some(favicon_dark)) => {
                    tracing::info!(light=?favicon, dark=?favicon_dark, "Using custom favicon");
                    templates.set_template(
                        "favicon.html",
                        format!(
                            r#"<link rel="icon" media="(prefers-color-scheme: light)" href="/{}"><link rel="icon" media="(prefers-color-scheme: dark)" href="/{}">"#,
                            favicon.to_str().unwrap(),
                            favicon_dark.to_str().unwrap()
                        )
                        .trim(),
                    );
                }
                (Some(favicon), None) => {
                    tracing::info!(favicon=?favicon, "Using custom favicon");
                    templates.set_template(
                        "favicon.html",
                        &format!(r#"<link rel="icon" href="/{}">"#, favicon.to_str().unwrap()),
                    );
                }
                (None, Some(favicon_dark)) => {
                    tracing::info!(favicon=?favicon_dark, "Using custom favicon");
                    templates.set_template(
                        "favicon.html",
                        &format!(
                            r#"<link rel="icon" href="/{}">"#,
                            favicon_dark.to_str().unwrap()
                        ),
                    );
                }
                (None, None) => {}
            }

            let uploads_settings = settings.uploads.clone();

            let old_settings = settings.clone();
            let settings = Arc::new(RwLock::new(settings));

            let (plugin_router, upload_router) = {
                let plugin_upload_provider_builder = UploadProviderContext {
                    settings: &old_settings,
                    db: cached_db.clone(),
                };
                let plugin_upload_provider = self_arc
                    .plugins
                    .upload_provider(&plugin_upload_provider_builder)
                    .await;

                if let Some(plugin_upload_provider) = plugin_upload_provider {
                    let upload_router = plugin_upload_provider.routes()?;

                    let mut plugin_builder = RunContext {
                        upload_provider: &plugin_upload_provider,
                        templates: &mut templates,
                        localizations: &mut localizer,
                        settings: settings.clone(),
                        divisions: &mut divisions,
                        rawdb: &rawdb,
                        db: cached_db.clone(),
                    };

                    let plugin_router = self_arc.plugins.run(&mut plugin_builder).await?;

                    (plugin_router, upload_router)
                } else if let Some(upload_provider) = &self_arc.upload_provider {
                    let upload_router = upload_provider.routes()?;

                    let mut plugin_builder = RunContext {
                        upload_provider,
                        templates: &mut templates,
                        localizations: &mut localizer,
                        settings: settings.clone(),
                        divisions: &mut divisions,
                        rawdb: &rawdb,
                        db: cached_db.clone(),
                    };

                    let plugin_router = self_arc.plugins.run(&mut plugin_builder).await?;

                    (plugin_router, upload_router)
                } else if let Some(s3) = uploads_settings.as_ref().and_then(|u| u.s3.as_ref()) {
                    let s3_upload_provider = S3UploadProvider::new(s3).await?;
                    let upload_router = s3_upload_provider.routes()?;

                    let mut plugin_builder = RunContext {
                        upload_provider: &s3_upload_provider,
                        templates: &mut templates,
                        localizations: &mut localizer,
                        settings: settings.clone(),
                        divisions: &mut divisions,
                        rawdb: &rawdb,
                        db: cached_db.clone(),
                    };

                    let plugin_router = self_arc.plugins.run(&mut plugin_builder).await?;

                    (plugin_router, upload_router)
                } else if uploads_settings
                    .as_ref()
                    .and_then(|u| u.database)
                    .is_some_and(|d| d)
                {
                    let database_upload_provider = DatabaseUploadProvider::new(db).await;
                    let upload_router = database_upload_provider.routes()?;

                    let mut plugin_builder = RunContext {
                        upload_provider: &database_upload_provider,
                        templates: &mut templates,
                        localizations: &mut localizer,
                        settings: settings.clone(),
                        divisions: &mut divisions,
                        rawdb: &rawdb,
                        db: cached_db.clone(),
                    };

                    let plugin_router = self_arc.plugins.run(&mut plugin_builder).await?;

                    (plugin_router, upload_router)
                } else {
                    let base_path = if let Some(local_upload_provider_options) =
                        uploads_settings.as_ref().and_then(|u| u.local.as_ref())
                    {
                        let base_path = &local_upload_provider_options.folder;
                        tracing::info!(
                            folder = base_path.as_str(),
                            "Using configured local upload provider"
                        );
                        base_path.into()
                    } else {
                        tracing::warn!(
                            folder = "uploads",
                            "No upload provider set, using local upload provider"
                        );
                        "uploads".into()
                    };

                    let local_upload_provider = LocalUploadProvider::new(base_path);

                    let upload_router = local_upload_provider.routes()?;

                    let mut plugin_builder = RunContext {
                        upload_provider: &local_upload_provider,
                        templates: &mut templates,
                        localizations: &mut localizer,
                        settings: settings.clone(),
                        divisions: &mut divisions,
                        rawdb: &rawdb,
                        db: cached_db.clone(),
                    };

                    let plugin_router = self_arc.plugins.run(&mut plugin_builder).await?;

                    (plugin_router, upload_router)
                }
            };

            let ip_extractor = match self_arc.ip_extractor {
                Some(ip_extractor) => Some(ip_extractor),
                None => settings
                    .read()
                    .await
                    .ip_preset
                    .as_ref()
                    .map(|preset| match preset {
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
                    }),
            };

            let mut jinja = templates.build();

            jinja.set_lstrip_blocks(true);
            jinja.set_trim_blocks(true);
            jinja.add_function("timediff", jinja_timediff);
            let localizer = Arc::new(localizer);
            let loc = localizer.clone();
            jinja.add_function(
                "t",
                move |msg_id: &str, kwargs: minijinja::value::Kwargs, state: &minijinja::State| {
                    jinja_translate(loc.clone(), msg_id, kwargs, state)
                },
            );

            let jinja = Arc::new(jinja);

            let (outbound_mailer, mailgun_router): (Option<Arc<_>>, axum::Router<RouterState>) =
                if let Some(email) = settings.clone().read().await.email.as_ref() {
                    let logo_path = find_image_file("static/logo")
                        .map(|p| p.to_str().unwrap().to_owned())
                        .unwrap_or("static/logo.svg".to_owned());
                    if email.mailgun.is_some() {
                        let (mailgun_provider, router) =
                            MailgunProvider::new(settings.clone()).await.unwrap();
                        let mail_provider = Arc::new(mailgun_provider);
                        let mailer = Arc::new(OutboundMailer::new(
                            mail_provider,
                            jinja.clone(),
                            settings.clone(),
                            cached_db.clone(),
                            &logo_path,
                        ));
                        (Some(mailer), router)
                    } else if email.smtp_connection_url.is_some() {
                        let mail_provider =
                            Arc::new(SmtpProvider::new(settings.clone()).await.unwrap());
                        let mailer = Arc::new(OutboundMailer::new(
                            mail_provider,
                            jinja.clone(),
                            settings.clone(),
                            cached_db.clone(),
                            &logo_path,
                        ));
                        (Some(mailer), axum::Router::new())
                    } else {
                        (None, axum::Router::new())
                    }
                } else {
                    (None, axum::Router::new())
                };

            let bot = if settings.clone().read().await.discord.is_some() {
                let bot = Arc::new(
                    Bot::new(settings.clone(), cached_db.clone(), outbound_mailer.clone()).await,
                );
                discord_cache_evictor();
                Some(bot)
            } else {
                None
            };

            {
                let locked_settings = settings.read().await;
                if bot.is_some()
                    && locked_settings
                        .email
                        .as_ref()
                        .is_some_and(|e| e.imap.is_some())
                {
                    ImapEmailReciever::new(
                        Arc::downgrade(&settings),
                        Arc::downgrade(bot.as_ref().unwrap()),
                        Arc::downgrade(&cached_db),
                    )
                    .receive_emails()
                    .await?;
                }
            }

            {
                let healthcheck_db = cached_db.clone();
                tokio::task::spawn(async move {
                    healthcheck_catch_up(healthcheck_db).await;
                });
            }
            healthcheck_runner(Arc::downgrade(&cached_db));

            cached_db.insert_divisions(&divisions).await?;

            let global_page_meta = Arc::new(GlobalPageMeta {
                title: settings.read().await.title.clone(),
                description: settings.read().await.description.clone().unwrap_or(
                    "Next generation extendable CTF framework with batteries included".to_owned(),
                ),
                location_url: settings.read().await.location_url.clone(),
                organizer: settings.read().await.organizer.clone(),
                generator: concat!("Rhombus v", env!("CARGO_PKG_VERSION")),
            });

            let router_state = Arc::new(RouterStateInner {
                db: cached_db.clone(),
                bot,
                jinja,
                localizer,
                settings: settings.clone(),
                ip_extractor: ip_extractor.unwrap_or(default_ip_extractor),
                outbound_mailer,
                divisions: Arc::new(divisions),
                router: rr.clone(),
                global_page_meta,
            });

            let rhombus_router = axum::Router::new()
                .fallback(handler_404)
                .route("/admin", get(|| async { (StatusCode::OK, Html("Admin")) }))
                .route("/reload", get(route_reload::<P, U>))
                .route_layer(middleware::from_fn(enforce_admin_middleware))
                .route(
                    "/account/verify/confirm",
                    get(route_account_email_verify_confirm),
                )
                .route("/account/verify", get(route_account_email_verify_callback))
                .route(
                    "/account/email",
                    post(route_account_add_email).delete(route_account_delete_email),
                )
                .route("/account/name", post(route_account_set_name))
                .route("/account", get(route_account))
                .route("/team/division/:id", post(route_team_set_division))
                .route("/team/user/:id", delete(route_user_kick))
                .route("/team/roll-token", post(route_team_roll_token))
                .route("/team/name", post(route_team_set_name))
                .route("/team", get(route_team))
                .route("/challenges", get(route_challenges))
                .route("/challenges.json", get(route_challenges))
                .route(
                    "/challenges/:id/writeup",
                    post(route_writeup_submit).delete(route_writeup_delete),
                )
                .route(
                    "/challenges/:id/ticket",
                    get(route_ticket_view).post(route_ticket_submit),
                )
                .route(
                    "/challenges/:id",
                    get(route_challenge_view).post(route_challenge_submit),
                )
                .route_layer(middleware::from_fn(enforce_auth_middleware))
                .nest_service("/static", get(route_static_serve))
                .route("/command-palette", get(route_command_palette_items))
                .route("/terms", get(route_terms))
                .route("/", get(route_home))
                .merge(mailgun_router)
                .route("/signout", get(route_signout))
                .route("/signin/credentials", post(route_signin_credentials))
                .route(
                    "/signin/email/confirm",
                    get(route_signin_email_confirm_callback),
                )
                .route(
                    "/signin/email",
                    get(route_signin_email_callback).post(route_signin_email),
                )
                .route(
                    "/signin/ctftime/callback",
                    get(route_signin_ctftime_callback),
                )
                .route("/signin/ctftime", get(route_signin_ctftime))
                .route(
                    "/signin/discord/callback",
                    get(route_signin_discord_callback),
                )
                .route("/signin/discord", get(route_signin_discord))
                .route("/signin", get(route_signin))
                .route(
                    "/scoreboard/:id/ctftime",
                    get(route_scoreboard_division_ctftime),
                )
                .route("/scoreboard/:id", get(route_scoreboard_division))
                .route("/scoreboard", get(route_scoreboard))
                .route("/scoreboard.json", get(route_scoreboard))
                .route("/user/:id/og-image.png", get(route_user_og_image))
                .route("/user/:id", get(route_public_user))
                .route("/team/:id/og-image.png", get(route_team_og_image))
                .route("/team/:id", get(route_public_team))
                .route("/og-image.png", get(route_default_og_image))
                .route("/robots.txt", get(route_robots_txt))
                .with_state(router_state.clone())
                .merge(upload_router.layer(middleware::from_fn_with_state(
                    router_state.clone(),
                    auth_injector_middleware,
                )));

            let router = if self_arc.num_plugins > 0 {
                axum::Router::new()
                    .fallback_service(rhombus_router)
                    .nest("/", plugin_router.with_state(router_state.clone()))
            } else {
                rhombus_router
            };

            track_flusher(cached_db);

            let router = router
                .layer(middleware::from_fn(page_meta_middleware))
                .layer(middleware::from_fn_with_state(
                    router_state.clone(),
                    locale_middleware,
                ))
                .layer(middleware::from_fn(track_middleware))
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

            let router = if let (Some(ip_extractor), Some(ratelimit)) = (
                ip_extractor,
                settings.clone().read().await.ratelimit.as_ref(),
            ) {
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

            let router = if settings.read().await.live_reload {
                router.layer(
                    tower_livereload::LiveReloadLayer::new().request_predicate(not_htmx_predicate),
                )
            } else {
                router
            };

            let router = router.layer(CompressionLayer::new());

            (self_arc, router)
        };

        let builder = Arc::try_unwrap(self_arc).unwrap();
        let builder = Arc::new(Mutex::new(Some(builder)));
        let router = router.layer(Extension(builder));

        Ok(router)
    }

    pub async fn build(self) -> Result<Arc<crate::internal::router::Router>> {
        let rr = Arc::new(crate::internal::router::Router::new());

        let router = self.build_axum_router(rr.clone()).await?;

        rr.update(router);

        Ok(rr)
    }
}

fn not_htmx_predicate<T>(req: &axum::http::Request<T>) -> bool {
    !req.headers().contains_key("hx-request")
}

async fn handler_404() -> impl IntoResponse {
    (StatusCode::NOT_FOUND, Html("404"))
}

pub fn hash(s: impl AsRef<str>) -> i64 {
    let s = s.as_ref();
    let mut hasher =
        BuildHasherDefault::<std::collections::hash_map::DefaultHasher>::default().build_hasher();
    hasher.write(s.as_bytes());
    let hash_value = hasher.finish();
    (hash_value >> 11) as i64
}

pub fn find_image_file(partial_path: &str) -> Option<std::path::PathBuf> {
    let exact_path = std::path::Path::new(partial_path);
    if exact_path.exists() {
        return Some(exact_path.to_path_buf());
    }

    let extensions = ["svg", "png", "webp", "jpg", "jpeg", "gif", "ico"];

    let dir = exact_path.parent().unwrap_or(std::path::Path::new("."));
    let base_name = exact_path
        .file_stem()
        .unwrap_or(exact_path.file_name().unwrap())
        .to_str()
        .unwrap();

    for ext in &extensions {
        let file_path = dir.join(format!("{}.{ext}", base_name));
        if file_path.exists() {
            return Some(file_path);
        }
    }

    None
}
