use axum::{extract::State, http::Uri, response::Html, Extension};
use cached::proc_macro::cached;
use minijinja::context;
use reqwest::Client;

use crate::{auth::ClientUser, locales::Lang, RhombusRouterState};

#[cached(time = 10, key = "String", convert = "{ discord_id.to_string() }")]
async fn is_in_server(discord_guild_id: &str, discord_id: &str, discord_bot_token: &str) -> bool {
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
    State(state): State<RhombusRouterState>,
    Extension(user): Extension<ClientUser>,
    Extension(lang): Extension<Lang>,
    uri: Uri,
) -> Html<String> {
    let in_server = is_in_server(
        &state.config.discord_guild_id,
        &user.discord_id,
        &state.config.discord_bot_token,
    )
    .await;

    Html(
        state
            .jinja
            .get_template("account.html")
            .unwrap()
            .render(context! {
                lang => lang,
                user => user,
                uri => uri.to_string(),
                location_url => state.config.location_url,
                og_image => format!("{}/og-image.png", state.config.location_url),
                in_server => in_server
            })
            .unwrap(),
    )
}
