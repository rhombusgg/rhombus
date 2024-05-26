use std::collections::BTreeMap;

use axum::{
    extract::{Path, State},
    http::Uri,
    response::{Html, IntoResponse, Response},
    Extension, Form,
};
use minijinja::context;
use rand::{
    distributions::{Alphanumeric, DistString},
    thread_rng,
};
use reqwest::StatusCode;
use serde::Deserialize;
use serde_json::json;
use unicode_segmentation::UnicodeSegmentation;

use crate::internal::{auth::User, locales::Languages, router::RouterState};

pub fn create_team_invite_token() -> String {
    Alphanumeric.sample_string(&mut thread_rng(), 16)
}

pub async fn route_team(
    state: State<RouterState>,
    Extension(user): Extension<User>,
    Extension(lang): Extension<Languages>,
    uri: Uri,
) -> impl IntoResponse {
    let challenge_data = state.db.get_challenges();
    let team = state.db.get_team_from_id(user.team_id);
    let (challenge_data, team) = tokio::join!(challenge_data, team);
    let challenge_data = challenge_data.unwrap();
    let team = team.unwrap();

    let location_url = { state.settings.read().await.location_url.clone() };
    let team_invite_url = format!("{}/signin?token={}", location_url, team.invite_token);

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
            .get_template("team.html")
            .unwrap()
            .render(context! {
                lang,
                user,
                team,
                team_invite_url,
                uri => uri.to_string(),
                location_url,
                now => chrono::Utc::now(),
                challenges,
                categories,
                og_image => format!("{}/og-image.png", location_url),
            })
            .unwrap(),
    )
}

pub async fn route_team_roll_token(
    state: State<RouterState>,
    Extension(user): Extension<User>,
    Extension(lang): Extension<Languages>,
) -> Result<impl IntoResponse, StatusCode> {
    if !user.is_team_owner {
        return Err(StatusCode::UNAUTHORIZED);
    }

    let new_invite_token = state.db.roll_invite_token(user.team_id).await.unwrap();

    let location_url = { state.settings.read().await.location_url.clone() };
    let team_invite_url = format!("{}/signin?token={}", location_url, new_invite_token);

    Ok(Html(
        state
            .jinja
            .get_template("team-token.html")
            .unwrap()
            .render(context! {
                lang => lang,
                team_invite_url => team_invite_url,
            })
            .unwrap(),
    ))
}

#[derive(Deserialize)]
pub struct SetTeamName {
    name: String,
}

pub async fn route_team_set_name(
    state: State<RouterState>,
    Extension(user): Extension<User>,
    Extension(lang): Extension<Languages>,
    Form(form): Form<SetTeamName>,
) -> Result<impl IntoResponse, StatusCode> {
    if !user.is_team_owner {
        return Err(StatusCode::UNAUTHORIZED);
    }

    let mut errors = vec![];
    let graphemes = form.name.graphemes(true).count();
    if !(3..=30).contains(&graphemes) {
        errors.push("Team name must be between 3 and 30 characters");
    } else if state
        .db
        .set_team_name(user.team_id, &form.name)
        .await
        .is_err()
    {
        errors.push("Team name already taken");
    }

    let team_name_template = state.jinja.get_template("team-set-name.html").unwrap();

    if errors.is_empty() {
        let html = team_name_template
            .render(context! {
                lang => lang,
                new_team_name => &form.name,
            })
            .unwrap();

        Ok(Response::builder()
            .header("Content-Type", "text/html")
            .header(
                "HX-Trigger",
                json!({
                    "successToast": "Set team name",
                })
                .to_string(),
            )
            .body(html)
            .unwrap())
    } else {
        let html = team_name_template
            .render(context! {
                lang => lang,
                errors => errors,
            })
            .unwrap();
        Ok(Response::builder()
            .header("Content-Type", "text/html")
            .body(html)
            .unwrap())
    }
}

pub async fn route_user_kick(
    state: State<RouterState>,
    Extension(user): Extension<User>,
    user_id: Path<i64>,
) -> impl IntoResponse {
    if user_id.0 == user.id && !user.is_team_owner {
        state.db.kick_user(user.id, user.team_id).await.unwrap();
        return Response::builder()
            .header("Content-Type", "text/html")
            .header("HX-Trigger", "pageRefresh")
            .body("".to_owned())
            .unwrap();
    }

    if !user.is_team_owner {
        return Response::builder()
            .status(StatusCode::UNAUTHORIZED)
            .body("".to_owned())
            .unwrap();
    }

    let team = state.db.get_team_from_id(user.team_id).await.unwrap();
    let user_in_team = team.users.keys().any(|&id| id == user_id.0);

    if !user_in_team {
        return Response::builder()
            .status(StatusCode::NOT_FOUND)
            .body("".to_owned())
            .unwrap();
    }

    state.db.kick_user(user_id.0, user.team_id).await.unwrap();

    Response::builder()
        .header("Content-Type", "text/html")
        .header("HX-Trigger", "pageRefresh")
        .body("".to_owned())
        .unwrap()
}
