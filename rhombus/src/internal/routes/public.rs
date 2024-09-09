use std::collections::BTreeMap;

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

    let mut challenges = BTreeMap::new();
    for challenge in &challenge_data.challenges {
        challenges.insert(challenge.id, challenge);
    }

    let mut categories = BTreeMap::new();
    for category in &challenge_data.categories {
        categories.insert(category.id, category);
    }

    Html(
        state
            .jinja
            .get_template("public-user.html")
            .unwrap()
            .render(context! {
                global => state.global_page_meta,
                page,
                title => format!("{} | {}", public_user.name, state.global_page_meta.title),
                user,
                public_user,
                public_team => team,
                now => chrono::Utc::now(),
                challenges,
                categories,
            })
            .unwrap(),
    )
    .into_response()
}

pub async fn route_public_team(
    state: State<RouterState>,
    Extension(user): Extension<MaybeUser>,
    Extension(page): Extension<PageMeta>,
    team_id: Path<i64>,
) -> impl IntoResponse {
    let Ok(team) = state.db.get_team_from_id(team_id.0).await else {
        return Json(json!({
            "error": "User not found",
        }))
        .into_response();
    };

    let challenge_data = state.db.get_challenges();
    let standings = state.db.get_team_standings(team_id.0);
    let (challenge_data, standings) = tokio::join!(challenge_data, standings);
    let challenge_data = challenge_data.unwrap();
    let standings = standings.unwrap();

    let mut challenges = BTreeMap::new();
    for challenge in &challenge_data.challenges {
        challenges.insert(challenge.id, challenge);
    }

    let mut categories = BTreeMap::new();
    for category in &challenge_data.categories {
        categories.insert(category.id, category);
    }

    Html(
        state
            .jinja
            .get_template("public-team.html")
            .unwrap()
            .render(context! {
                global => state.global_page_meta,
                page,
                title => format!("{} | {}", team.name, state.global_page_meta.title),
                user,
                public_team => team,
                now => chrono::Utc::now(),
                challenges,
                categories,
                divisions => state.divisions,
                standings => standings.standings,
            })
            .unwrap(),
    )
    .into_response()
}
