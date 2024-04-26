use config::ConfigError;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum RhombusError {
    #[cfg(feature = "libsql")]
    #[error("LibSQL error")]
    LibSQL(#[from] libsql::Error),

    #[cfg(feature = "postgres")]
    #[error("Postgres error")]
    Postgres(#[from] sqlx::Error),

    #[cfg(feature = "postgres")]
    #[error("Postgres configuration error")]
    PostgresConfiguration(#[from] sqlx::migrate::MigrateError),

    #[error("Template error")]
    Template(#[from] minijinja::Error),

    #[error("Required configuration: {0}")]
    MissingConfiguration(String),

    #[error("Configuration")]
    Configuration(#[from] ConfigError),

    #[error("Database configuration error: {0}")]
    DatabaseConfiguration(#[from] DatabaseConfigurationError),
}

#[derive(Error, Debug)]
pub enum DatabaseConfigurationError {
    #[error("Unkown database scheme in url {0}")]
    UnknownUrlScheme(String),

    #[error("Feature `{0}` must be enabled for database url {0}")]
    MissingFeature(String, String),
}
