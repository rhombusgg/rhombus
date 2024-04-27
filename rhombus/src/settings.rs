use serde::Deserialize;

#[cfg(feature = "postgres")]
use sqlx::PgPool;

#[derive(Debug, Deserialize, Clone)]
pub struct DiscordSettings {
    pub client_id: String,
    pub client_secret: String,
    pub bot_token: String,
    pub guild_id: String,
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
pub struct Settings {
    pub location_url: String,
    pub jwt_secret: String,
    pub database_url: Option<String>,
    pub discord: DiscordSettings,
    pub ratelimit: Option<RateLimitSettings>,
    pub ip_preset: Option<IpPreset>,
    pub live_reload: bool,
}

pub enum DbConfig {
    Url(String),

    #[cfg(feature = "postgres")]
    RawPostgres(PgPool),

    #[cfg(feature = "libsql")]
    LibSQL(String, String),

    #[cfg(feature = "libsql")]
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

#[cfg(feature = "postgres")]
impl From<PgPool> for DbConfig {
    fn from(value: PgPool) -> Self {
        Self::RawPostgres(value)
    }
}

#[cfg(feature = "libsql")]
impl From<libsql::Connection> for DbConfig {
    fn from(value: libsql::Connection) -> Self {
        Self::RawLibSQL(value)
    }
}

#[cfg(feature = "libsql")]
impl From<(&str, &str)> for DbConfig {
    fn from(value: (&str, &str)) -> Self {
        Self::LibSQL(value.0.to_owned(), value.1.to_owned())
    }
}

#[cfg(feature = "libsql")]
impl From<(String, String)> for DbConfig {
    fn from(value: (String, String)) -> Self {
        Self::LibSQL(value.0, value.1)
    }
}
