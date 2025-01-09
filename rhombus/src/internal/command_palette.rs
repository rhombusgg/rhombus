use axum::{extract::State, response::IntoResponse, Extension, Json};
use serde_json::{json, Value};

use crate::internal::{auth::MaybeUser, router::RouterState};

pub async fn route_command_palette_items(
    State(state): State<RouterState>,
    Extension(user): Extension<MaybeUser>,
) -> impl IntoResponse {
    let challenge_data = match state.db.get_challenges().await {
        Ok(challenge_data) => challenge_data,
        Err(e) => {
            let user_id = user.as_ref().map(|u| u.id);
            tracing::error!(error = ?e, user_id, "Failed to get challenges");
            return Json(json!({}));
        }
    };

    let divisions = state
        .divisions
        .iter()
        .map(|division| (division.id.to_string(), division.name.clone()))
        .collect::<Value>();

    if let Some(user) = user {
        if let Some(start_time) = state.settings.read().await.start_time {
            if !user.is_admin && chrono::Utc::now() < start_time {
                return Json(json!({
                    "divisions": divisions,
                }));
            }
        }

        let challenges = challenge_data
            .categories
            .values()
            .map(|category| {
                let challenges = challenge_data
                    .challenges
                    .values()
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
        Json(json!({
            "divisions": divisions,
        }))
    }
}
