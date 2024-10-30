use config::ConfigError;
use thiserror::Error;

pub type Result<T> = std::result::Result<T, RhombusError>;

#[derive(Error, Debug)]
pub enum RhombusError {
    #[cfg(feature = "libsql")]
    #[error("LibSQL error: {0}")]
    LibSQL(#[from] libsql::Error),

    #[cfg(feature = "postgres")]
    #[error("Postgres error: {0}")]
    Postgres(#[from] sqlx::Error),

    #[cfg(feature = "postgres")]
    #[error("Postgres configuration error: {0}")]
    PostgresConfiguration(#[from] sqlx::migrate::MigrateError),

    #[error("Template error")]
    Template(#[from] minijinja::Error),

    #[error("Required configuration: {0}")]
    MissingConfiguration(String),

    #[error("Database error")]
    UnknownDatabase(),

    #[error("Unknown")]
    Unknown(),

    #[error("Configuration: {0}")]
    Configuration(#[from] ConfigError),

    #[error("Database configuration error: {0}")]
    DatabaseConfiguration(#[from] DatabaseConfigurationError),

    #[error("Discord: {0}")]
    Discord(#[from] serenity::Error),

    #[cfg(feature = "smtp")]
    #[error("Email: {0}")]
    Email(#[from] lettre::address::AddressError),

    #[cfg(feature = "smtp")]
    #[error("Email: {0}")]
    Email2(#[from] lettre::transport::smtp::Error),

    #[cfg(feature = "smtp")]
    #[error("Email: {0}")]
    Email3(#[from] lettre::error::Error),

    #[error("Password hash error: {0}")]
    PasswordHash(#[from] argon2::password_hash::Error),

    #[error("Reqwest error: {0}")]
    Reqwest(#[from] reqwest::Error),

    #[cfg(feature = "s3")]
    #[error("S3 Error")]
    S3(#[from] s3::error::S3Error),

    #[cfg(feature = "s3")]
    #[error("S3 Credentials Error")]
    S3Credentials(#[from] s3::creds::error::CredentialsError),

    #[error("IO error: {0}")]
    IO(#[from] std::io::Error),
}

#[derive(Error, Debug)]
pub enum DatabaseConfigurationError {
    #[error("Unkown database scheme in url {0}")]
    UnknownUrlScheme(String),

    #[error("Feature `{0}` must be enabled for database url {0}")]
    MissingFeature(String, String),
}
