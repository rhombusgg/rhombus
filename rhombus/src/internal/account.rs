use std::time::Duration;

use axum::{extract::State, http::Uri, response::Html, Extension};
use dashmap::DashMap;
use minijinja::context;
use reqwest::Client;
use tracing::debug;

use super::{auth::User, cache_layer::TimedCache, locales::Languages, router::RouterState};

lazy_static::lazy_static! {
    pub static ref IS_IN_SERVER_CACHE: DashMap<String, TimedCache<bool>> = DashMap::new();
}

async fn is_in_server(discord_guild_id: &str, discord_id: &str, discord_bot_token: &str) -> bool {
    if let Some(team) = IS_IN_SERVER_CACHE.get(discord_id) {
        return team.value;
    }
    tracing::trace!(discord_id, "cache miss: is_in_server");

    let client = Client::new();
    let res = client
        .get(format!(
            "https://discord.com/api/guilds/{}/members/{}",
            discord_guild_id, discord_id
        ))
        .header("Authorization", format!("Bot {}", discord_bot_token))
        .send()
        .await
        .unwrap();

    let is_in = res.status().is_success();
    IS_IN_SERVER_CACHE.insert(discord_id.to_owned(), TimedCache::new(is_in));
    is_in
}

pub async fn route_account(
    state: State<RouterState>,
    Extension(user): Extension<User>,
    Extension(lang): Extension<Languages>,
    uri: Uri,
) -> Html<String> {
    let in_server = is_in_server(
        &state.settings.discord.guild_id,
        &user.discord_id,
        &state.settings.discord.bot_token,
    )
    .await;
    debug!(user_id = user.id, in_server, "Discord");

    Html(
        state
            .jinja
            .get_template("account.html")
            .unwrap()
            .render(context! {
                lang => lang,
                user => user,
                uri => uri.to_string(),
                in_server => in_server,
                location_url => state.settings.location_url,
                og_image => format!("{}/og-image.png", state.settings.location_url),
            })
            .unwrap(),
    )
}

pub fn discord_cache_evictor() {
    tokio::task::spawn(async {
        let interval = Duration::from_secs(10);
        loop {
            tokio::time::sleep(interval).await;
            // tracing::trace!("Evicting discord id cache");
            let evict_threshold = (chrono::Utc::now() - interval).timestamp();
            IS_IN_SERVER_CACHE.retain(|_, v| v.insert_timestamp > evict_threshold);
        }
    });
}
