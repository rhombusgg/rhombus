use axum::{extract::State, http::Uri, response::Html, Extension};
use cached::proc_macro::cached;
use minijinja::context;
use reqwest::Client;
use tracing::debug;

use crate::{auth::User, locales::Lang, RouterState};

#[cached(time = 10, key = "String", convert = "{ discord_id.to_string() }")]
async fn is_in_server(discord_guild_id: &str, discord_id: &str, discord_bot_token: &str) -> bool {
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

    res.status().is_success()
}

pub async fn route_account(
    State(state): State<RouterState>,
    Extension(user): Extension<User>,
    Extension(lang): Extension<Lang>,
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
