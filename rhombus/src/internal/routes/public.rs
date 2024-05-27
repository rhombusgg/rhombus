use std::collections::BTreeMap;

use axum::{
    extract::{Path, State},
    http::Uri,
    response::{Html, IntoResponse},
    Extension,
};
use minijinja::context;

use crate::internal::{auth::MaybeUser, locales::Languages, router::RouterState};

pub async fn route_public_user(
    state: State<RouterState>,
    Extension(user): Extension<MaybeUser>,
    Extension(lang): Extension<Languages>,
    user_id: Path<i64>,
    uri: Uri,
) -> impl IntoResponse {
    let public_user = state.db.get_user_from_id(user_id.0).await.unwrap();
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
                lang,
                user,
                uri => uri.to_string(),
                public_user,
                public_team => team,
                now => chrono::Utc::now(),
                challenges,
                categories,
            })
            .unwrap(),
    )
}

pub async fn route_public_team(
    state: State<RouterState>,
    Extension(user): Extension<MaybeUser>,
    Extension(lang): Extension<Languages>,
    team_id: Path<i64>,
    uri: Uri,
) -> impl IntoResponse {
    let challenge_data = state.db.get_challenges();
    let team = state.db.get_team_from_id(team_id.0);
    let standings = state.db.get_team_standings(team_id.0);
    let (challenge_data, team, standings) = tokio::join!(challenge_data, team, standings);
    let challenge_data = challenge_data.unwrap();
    let team = team.unwrap();
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
                lang,
                user,
                uri => uri.to_string(),
                public_team => team,
                now => chrono::Utc::now(),
                challenges,
                categories,
                divisions => state.divisions,
                standings => standings.standings,
            })
            .unwrap(),
    )
}
