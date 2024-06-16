use std::num::NonZeroU64;

use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct DiscordSettings {
    pub client_id: NonZeroU64,
    pub client_secret: String,
    pub bot_token: String,
    pub guild_id: NonZeroU64,
    pub first_blood_channel_id: Option<NonZeroU64>,
    pub support_channel_id: Option<NonZeroU64>,
    pub author_role_id: Option<NonZeroU64>,
    pub verified_role_id: Option<NonZeroU64>,
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
pub struct EmailSettings {
    pub connection_url: String,
    pub from: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Division {
    pub stable_id: Option<String>,
    pub name: String,
    pub description: String,
    pub requirement: Option<String>,
    pub email_regex: Option<String>,
    pub max_players: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub enum AuthProvider {
    #[serde(rename = "discord")]
    Discord,
    #[serde(rename = "email")]
    Email,
    #[serde(rename = "ctftime")]
    CTFtime,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Settings {
    pub title: String,
    pub location_url: String,
    pub jwt_secret: String,
    pub database_url: Option<String>,
    pub discord: DiscordSettings,
    pub ratelimit: Option<RateLimitSettings>,
    pub ip_preset: Option<IpPreset>,
    pub live_reload: bool,
    pub default_ticket_template: String,
    pub immutable_config: bool,
    pub contact_email: Option<String>,
    pub divisions: Option<Vec<Division>>,
    pub email: Option<EmailSettings>,
    pub local_upload_provider: Option<LocalUploadProviderSettings>,
    pub auth: Vec<AuthProvider>,

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
    RawLibSQL(libsql::Connection),
}

#[cfg(feature = "postgres")]
impl From<sqlx::PgPool> for DbConfig {
    fn from(value: sqlx::PgPool) -> Self {
        Self::RawPostgres(value)
    }
}

#[cfg(feature = "libsql")]
impl From<libsql::Connection> for DbConfig {
    fn from(value: libsql::Connection) -> Self {
        Self::RawLibSQL(value)
    }
}
