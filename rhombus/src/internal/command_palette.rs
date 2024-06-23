use axum::{extract::State, response::IntoResponse, Extension, Json};
use serde_json::{json, Value};

use crate::internal::{auth::MaybeUser, router::RouterState};

pub async fn route_command_palette_items(
    state: State<RouterState>,
    Extension(user): Extension<MaybeUser>,
) -> impl IntoResponse {
    let challenge_data = state.db.get_challenges().await.unwrap();

    let divisions = state
        .divisions
        .iter()
        .map(|division| (division.id.to_string(), division.name.clone()))
        .collect::<Value>();

    if user.is_some() {
        let challenges = challenge_data
            .categories
            .iter()
            .map(|category| {
                let challenges = challenge_data
                    .challenges
                    .iter()
                    .filter(|challenge| challenge.category_id == category.id)
                    .map(|challenge| challenge.name.clone())
                    .collect::<Value>();

                (category.name.clone(), challenges)
            })
            .collect::<Value>();

        Json(json!({
            "challenges": challenges,
            "divisions": divisions,
        }))
    } else {
        let (discord_client_id, location_url) = {
            let settings = state.settings.read().await;
            (
                settings.discord.as_ref().map(|d| d.client_id),
                settings.location_url.clone(),
            )
        };

        if let Some(discord_client_id) = discord_client_id {
            let discord_signin_url = format!(
                "https://discord.com/api/oauth2/authorize?client_id={}&redirect_uri={}/signin/discord&response_type=code&scope=identify+guilds.join",
                discord_client_id,
                location_url,
            );

            return Json(json!({
                "discord_signin_url": discord_signin_url,
                "divisions": divisions,
            }));
        }

        Json(json!({
            "divisions": divisions,
        }))
    }
}
