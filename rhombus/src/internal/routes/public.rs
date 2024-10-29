use axum::{
    extract::{Path, State},
    response::{Html, IntoResponse},
    Extension, Json,
};
use minijinja::context;
use serde_json::json;

use crate::internal::{auth::MaybeUser, router::RouterState, routes::meta::PageMeta};

pub async fn route_public_user(
    state: State<RouterState>,
    Extension(user): Extension<MaybeUser>,
    Extension(page): Extension<PageMeta>,
    user_id: Path<i64>,
) -> impl IntoResponse {
    let Ok(public_user) = state.db.get_user_from_id(user_id.0).await else {
        return Json(json!({
            "error": "User not found",
        }))
        .into_response();
    };

    let challenge_data = state.db.get_challenges();
    let team = state.db.get_team_from_id(public_user.team_id);
    let (challenge_data, team) = tokio::join!(challenge_data, team);
    let challenge_data = challenge_data.unwrap();
    let team = team.unwrap();

    Html(
        state
            .jinja
            .get_template("public-user.html")
            .unwrap()
            .render(context! {
                global => state.global_page_meta,
                page,
                title => format!("{} | {}", public_user.name, state.global_page_meta.title),
                og_image => format!("{}/user/{}/og-image.png", state.global_page_meta.location_url, public_user.id),
                user,
                public_user,
                public_team => team,
                now => chrono::Utc::now(),
                challenges => challenge_data.challenges,
                categories => challenge_data.categories,
            })
            .unwrap(),
    )
    .into_response()
}

pub async fn route_public_team(
    state: State<RouterState>,
    Extension(user): Extension<MaybeUser>,
    Extension(page): Extension<PageMeta>,
    Path(team_id): Path<i64>,
) -> impl IntoResponse {
    let Ok(team) = state.db.get_team_from_id(team_id).await else {
        return Json(json!({
            "error": "Team not found",
        }))
        .into_response();
    };

    let challenge_data = state.db.get_challenges();
    let standing = state.db.get_team_standing(team_id, &team.division_id);
    let (challenge_data, standing) = tokio::join!(challenge_data, standing);
    let challenge_data = challenge_data.unwrap();
    let standing = standing.unwrap();

    Html(
        state
            .jinja
            .get_template("public-team.html")
            .unwrap()
            .render(context! {
                global => state.global_page_meta,
                og_image => format!("{}/team/{}/og-image.png", state.global_page_meta.location_url, team.id),
                page,
                title => format!("{} | {}", team.name, state.global_page_meta.title),
                user,
                public_team => team,
                now => chrono::Utc::now(),
                challenges => challenge_data.challenges,
                categories => challenge_data.categories,
                divisions => state.divisions,
                standing,
            })
            .unwrap(),
    )
    .into_response()
}
