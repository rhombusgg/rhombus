use std::num::NonZeroU64;

use serde::Deserialize;

#[derive(Debug, Deserialize, Clone)]
pub struct DiscordSettings {
    pub client_id: String,
    pub client_secret: String,
    pub bot_token: String,
    pub guild_id: NonZeroU64,
    pub first_blood_channel_id: Option<NonZeroU64>,
    pub support_channel_id: Option<NonZeroU64>,
}

#[derive(Debug, Deserialize, Clone)]
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

#[derive(Debug, Deserialize, Clone)]
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

#[derive(Debug, Deserialize, Clone)]
#[cfg(feature = "libsql")]
pub struct Turso {
    pub auth_token: String,
    pub local_replica_path: Option<String>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct Settings {
    pub location_url: String,
    pub jwt_secret: String,
    pub database_url: Option<String>,
    pub discord: DiscordSettings,
    pub ratelimit: Option<RateLimitSettings>,
    pub ip_preset: Option<IpPreset>,
    pub live_reload: bool,
    pub default_ticket_template: String,

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
