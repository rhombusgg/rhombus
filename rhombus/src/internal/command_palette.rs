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
        Json(json!({
            "divisions": divisions,
        }))
    }
}
