use axum::{extract::State, response::IntoResponse, Extension, Json};
use serde_json::{json, Value};

use crate::internal::{auth::MaybeUser, router::RouterState};

use super::discord;

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
        let (location_url, discord) = {
            let settings = state.settings.read().await;
            (
                settings.location_url.clone(),
                settings.discord.as_ref().map(|d| (d.client_id, d.autojoin)),
            )
        };

        if let Some(discord) = discord {
            let discord_signin_url = discord::signin_url(&location_url, discord.0, discord.1);

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
