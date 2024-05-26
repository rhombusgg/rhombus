use config::ConfigError;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, RhombusError>;

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

    #[error("Database error")]
    UnknownDatabase(),

    #[error("Unknown")]
    Unknown(),

    #[error("Configuration")]
    Configuration(#[from] ConfigError),

    #[error("Database configuration error: {0}")]
    DatabaseConfiguration(#[from] DatabaseConfigurationError),

    #[error("Discord: {0}")]
    Discord(#[from] serenity::Error),

    #[error("Email: {0}")]
    Email(#[from] lettre::address::AddressError),

    #[error("Email: {0}")]
    Email2(#[from] lettre::transport::smtp::Error),

    #[error("Email: {0}")]
    Email3(#[from] lettre::error::Error),
}

#[derive(Error, Debug)]
pub enum DatabaseConfigurationError {
    #[error("Unkown database scheme in url {0}")]
    UnknownUrlScheme(String),

    #[error("Feature `{0}` must be enabled for database url {0}")]
    MissingFeature(String, String),
}
