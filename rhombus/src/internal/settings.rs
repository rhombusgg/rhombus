use std::{num::NonZeroU64, sync::Arc};

use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct DiscordSettings {
    pub client_id: NonZeroU64,
    pub autojoin: Option<bool>,
    pub client_secret: String,
    pub bot_token: String,
    pub guild_id: NonZeroU64,
    pub first_blood_channel_id: Option<NonZeroU64>,
    pub support_channel_id: Option<NonZeroU64>,
    pub author_role_id: Option<NonZeroU64>,
    pub verified_role_id: Option<NonZeroU64>,
    pub top10_role_id: Option<NonZeroU64>,
    pub invite_url: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct RateLimitSettings {
    /// Set the interval after which one element of the quota is replenished in milliseconds.
    ///
    /// **The interval must not be zero.**
    pub per_millisecond: Option<u64>,

    /// Set quota size that defines how many requests can occur
    /// before the governor middleware starts blocking requests from an IP address and
    /// clients have to wait until the elements of the quota are replenished.
    ///
    /// **The burst_size must not be zero.**
    pub burst_size: Option<u32>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub enum IpPreset {
    #[serde(rename = "rightmost-x-forwarded-for")]
    RightmostXForwardedFor,
    #[serde(rename = "x-real-ip")]
    XRealIp,
    #[serde(rename = "fly-client-ip")]
    FlyClientIp,
    #[serde(rename = "true-client-ip")]
    TrueClientIp,
    #[serde(rename = "cf-connecting-ip")]
    CFConnectingIp,
    #[serde(rename = "peer-ip")]
    PeerIp,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[cfg(feature = "libsql")]
pub struct Turso {
    pub auth_token: String,
    pub local_replica_path: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct LocalUploadProviderSettings {
    pub folder: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct S3UploadProviderSettings {
    pub bucket_name: String,
    pub bucket_region: Option<String>,
    pub access_key: Option<String>,
    pub secret_key: Option<String>,
    pub security_token: Option<String>,
    pub session_token: Option<String>,
    pub profile: Option<String>,
    pub endpoint: Option<String>,
    pub prefix: Option<String>,
    pub path_style: Option<bool>,
    pub presigned_get_expiry: Option<u32>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct UploadProviderSettings {
    pub local: Option<LocalUploadProviderSettings>,
    pub s3: Option<S3UploadProviderSettings>,
    pub database: Option<bool>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct MailgunSettings {
    pub api_key: String,
    pub domain: String,
    pub webhook_signing_key: String,
    pub endpoint: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ImapSettings {
    pub poll_interval: Option<u64>,
    pub inbox: Option<String>,
    pub idle: Option<bool>,
    pub port: Option<u16>,
    pub domain: String,
    pub username: String,
    pub password: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct EmailSettings {
    pub from: String,
    pub mailgun: Option<MailgunSettings>,
    pub smtp_connection_url: Option<String>,
    pub imap: Option<ImapSettings>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Division {
    pub stable_id: Option<String>,
    pub name: String,
    pub description: String,
    pub requirement: Option<String>,
    pub email_regex: Option<String>,
    pub max_players: Option<String>,
    pub discord_role_id: Option<NonZeroU64>,
}

#[derive(Debug, Deserialize, Serialize, Clone, PartialEq, Eq)]
pub enum AuthProvider {
    #[serde(rename = "discord")]
    Discord,
    #[serde(rename = "email")]
    Email,
    #[serde(rename = "ctftime")]
    CTFtime,
    #[serde(rename = "credentials")]
    Credentials,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct HomeSettings {
    pub content: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct CTFtimeSettings {
    pub client_id: NonZeroU64,
    pub client_secret: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Settings {
    pub title: String,
    pub description: Option<String>,
    pub organizer: Option<String>,
    pub logo: Option<String>,
    pub logo_dark: Option<String>,
    pub home: Option<HomeSettings>,
    pub terms: Option<String>,
    pub start_time: Option<chrono::DateTime<chrono::Utc>>,
    pub end_time: Option<chrono::DateTime<chrono::Utc>>,
    pub location_url: String,
    pub jwt_secret: String,
    pub database_url: Option<String>,
    pub discord: Option<DiscordSettings>,
    pub ratelimit: Option<RateLimitSettings>,
    pub ip_preset: Option<IpPreset>,
    pub live_reload: bool,
    pub default_ticket_template: String,
    pub immutable_config: bool,
    pub contact_email: Option<String>,
    pub divisions: Option<Vec<Division>>,
    pub email: Option<EmailSettings>,
    pub uploads: Option<UploadProviderSettings>,
    pub auth: Vec<AuthProvider>,
    pub ctftime: Option<CTFtimeSettings>,
    pub openai_api_key: Option<String>,

    /// A pre-shared key for rhombus-cli with admin access.
    pub api_key: Option<String>,

    /// `false` will disable the in memory cache.
    ///
    /// `true` will enable the in memory cache with default 360 second interval.
    ///
    /// Integers above `5` will be the number in seconds that values are
    /// considered valid for. Other values are invalid and will disable the in
    /// memory cache.
    pub in_memory_cache: String,

    #[cfg(feature = "libsql")]
    pub turso: Option<Turso>,
}

pub enum DbConfig {
    #[cfg(feature = "postgres")]
    RawPostgres(sqlx::PgPool),

    #[cfg(feature = "libsql")]
    RawLibSQL(Arc<libsql::Database>),
}

#[cfg(feature = "postgres")]
impl From<sqlx::PgPool> for DbConfig {
    fn from(value: sqlx::PgPool) -> Self {
        Self::RawPostgres(value)
    }
}

#[cfg(feature = "libsql")]
impl From<Arc<libsql::Database>> for DbConfig {
    fn from(value: Arc<libsql::Database>) -> Self {
        Self::RawLibSQL(value)
    }
}
