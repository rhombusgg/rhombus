use std::time::Duration;

use axum::{
    body::Body,
    extract::{Path, State},
    http::{Request, Uri},
    response::{Html, IntoResponse, Response},
    Extension, Form, Json,
};
use minijinja::context;
use serde::Deserialize;
use serde_json::json;

use crate::internal::{auth::User, locales::Languages, router::RouterState};

pub async fn route_challenges(
    state: State<RouterState>,
    Extension(user): Extension<User>,
    Extension(lang): Extension<Languages>,
    uri: Uri,
    req: Request<Body>,
) -> impl IntoResponse {
    let challenge_data = state.db.get_challenges();
    let team = state.db.get_team_from_id(user.team_id);
    let (challenge_data, team) = tokio::join!(challenge_data, team);
    let challenge_data = challenge_data.unwrap();
    let team = team.unwrap();

    let challenge_json = json!({
        "ticket_enabled": state.settings.read().await.discord.support_channel_id.is_some(),
        "challenges": challenge_data.challenges.iter().map(|challenge| json!({
            "id": challenge.id,
            "name": challenge.name,
            "description": challenge.description,
            "healthy": challenge.healthy,
            "category_id": challenge.category_id,
            "author_id": challenge.author_id,
            "division_points": challenge.division_points.iter().map(|division_points| json!({
                "division_id": division_points.division_id,
                "points": division_points.points,
                "solves": division_points.solves,
            })).collect::<serde_json::Value>(),
        })).collect::<serde_json::Value>(),
        "categories": challenge_data.categories.iter().map(|category| json!({
            "id": category.id,
            "name": category.name,
            "color": category.color,
        })).collect::<serde_json::Value>(),
        "authors": challenge_data.authors.iter().map(|author|
            (author.0.to_string(), json!({
                "name": author.1.name,
                "avatar_url": author.1.avatar_url,
            }))
        ).collect::<serde_json::Value>(),
        "divisions": challenge_data.divisions.iter().map(|division|
            (division.0.to_string(), json!({
                "name": division.1.name,
            }))
        ).collect::<serde_json::Value>(),
        "team": json!({
            "users": team.users.iter().map(|user|
                (user.0.to_string(), json!({
                    "name": user.1.name,
                    "avatar_url": user.1.avatar_url,
                }))
            ).collect::<serde_json::Value>(),
            "solves": team.solves.iter().map(|solve|
                (solve.0.to_string(), json!({
                    "solved_at": solve.1.solved_at,
                    "user_id": solve.1.user_id,
                }))
            ).collect::<serde_json::Value>(),
        })
    });

    if let Some(accept) = req.headers().get("accept") {
        if accept.to_str().unwrap() == "application/json" {
            return Json(challenge_json).into_response();
        }
    }

    let html = state
        .jinja
        .get_template("challenges.html")
        .unwrap()
        .render(context! {
            lang,
            user,
            uri => uri.to_string(),
            challenge_json,
        })
        .unwrap();

    Html(html).into_response()
}

pub async fn route_challenge_view(
    state: State<RouterState>,
    Extension(user): Extension<User>,
    Extension(lang): Extension<Languages>,
    challenge_id: Path<i64>,
    uri: Uri,
) -> impl IntoResponse {
    let challenge_data = state.db.get_challenges();
    let team = state.db.get_team_from_id(user.team_id);
    let user_writeups = state.db.get_writeups_from_user_id(user.id);
    let (challenge_data, team, user_writeups) = tokio::join!(challenge_data, team, user_writeups);
    let challenge_data = challenge_data.unwrap();
    let team = team.unwrap();
    let user_writeups = user_writeups.unwrap();

    let challenge = challenge_data
        .challenges
        .iter()
        .find(|c| challenge_id.eq(&c.id))
        .unwrap();
    let category = challenge_data
        .categories
        .iter()
        .find(|c| challenge.category_id.eq(&c.id))
        .unwrap();

    Html(
        state
            .jinja
            .get_template("challenge.html")
            .unwrap()
            .render(context! {
                lang => lang,
                user => user,
                uri => uri.to_string(),
                challenge => challenge,
                category => category,
                team => team,
                divisions => challenge_data.divisions,
                user_writeups => user_writeups,
            })
            .unwrap(),
    )
}

pub async fn route_ticket_view(
    state: State<RouterState>,
    Extension(user): Extension<User>,
    Extension(lang): Extension<Languages>,
    challenge_id: Path<i64>,
    uri: Uri,
) -> impl IntoResponse {
    let challenge_data = state.db.get_challenges();
    let team = state.db.get_team_from_id(user.team_id);
    let (challenge_data, team) = tokio::join!(challenge_data, team);
    let challenge_data = challenge_data.unwrap();
    let team = team.unwrap();

    let challenge = challenge_data
        .challenges
        .iter()
        .find(|c| challenge_id.eq(&c.id))
        .unwrap();
    let category = challenge_data
        .categories
        .iter()
        .find(|c| challenge.category_id.eq(&c.id))
        .unwrap();

    let ticket_template = if let Some(ticket_template) = &challenge.ticket_template {
        ticket_template.clone()
    } else {
        state.settings.read().await.default_ticket_template.clone()
    };

    Html(
        state
            .jinja
            .get_template("ticket.html")
            .unwrap()
            .render(context! {
                lang,
                user,
                uri => uri.to_string(),
                challenge,
                category,
                team,
                ticket_template,
            })
            .unwrap(),
    )
}

#[derive(Deserialize)]
pub struct TicketSubmit {
    content: String,
}

pub async fn route_ticket_submit(
    state: State<RouterState>,
    Extension(user): Extension<User>,
    Extension(lang): Extension<Languages>,
    challenge_id: Path<i64>,
    Form(form): Form<TicketSubmit>,
) -> impl IntoResponse {
    if state
        .settings
        .read()
        .await
        .discord
        .support_channel_id
        .is_none()
    {
        return Response::builder()
            .header("Content-Type", "text/html")
            .header("HX-Trigger", "closeModal")
            .body("".to_owned())
            .unwrap();
    }

    let content = form.content;

    if content.len() > 1000 {
        let html = state
            .jinja
            .get_template("challenge-submit.html")
            .unwrap()
            .render(context! {
                lang => lang,
                user => user,
                error => state.localizer.localize(&lang, "challenges-error-ticket-too-long", None),
            })
            .unwrap();

        return Response::builder()
            .header("content-type", "text/html")
            .body(html)
            .unwrap();
    }

    let challenge_data = state.db.get_challenges();
    let team = state.db.get_team_from_id(user.team_id);
    let (challenge_data, team) = tokio::join!(challenge_data, team);
    let challenge_data = challenge_data.unwrap();
    let team = team.unwrap();

    let challenge = challenge_data
        .challenges
        .iter()
        .find(|c| challenge_id.eq(&c.id))
        .unwrap();

    let author = challenge_data.authors.get(&challenge.author_id).unwrap();

    state
        .bot
        .create_support_thread(&user, &team, challenge, author, content.as_str())
        .await
        .unwrap();

    Response::builder()
        .header("Content-Type", "text/html")
        .header(
            "HX-Trigger",
            json!({
                "closeModal": true,
            })
            .to_string(),
        )
        .body(format!(
            r#"<div id="htmx-toaster" data-toast="success" hx-swap-oob="true">{}</div>"#,
            state
                .localizer
                .localize(&lang, "challenges-ticket-submitted", None)
                .unwrap()
        ))
        .unwrap()
}

#[derive(Deserialize)]
pub struct SubmitChallenge {
    flag: String,
}

pub async fn route_challenge_submit(
    state: State<RouterState>,
    Extension(user): Extension<User>,
    Extension(lang): Extension<Languages>,
    challenge_id: Path<i64>,
    Form(form): Form<SubmitChallenge>,
) -> impl IntoResponse {
    let challenge_data = state.db.get_challenges().await.unwrap();
    let challenge = challenge_data
        .challenges
        .iter()
        .find(|c| challenge_id.eq(&c.id))
        .unwrap();

    if challenge.flag != form.flag {
        let html = state
            .jinja
            .get_template("challenge-submit.html")
            .unwrap()
            .render(context! {
                lang => lang,
                error => state.localizer.localize(&lang, "challenges-error-incorrect-flag", None),
            })
            .unwrap();
        return Response::builder()
            .header("content-type", "text/html")
            .body(html)
            .unwrap();
    }

    let first_bloods = state
        .db
        .solve_challenge(user.id, user.team_id, challenge)
        .await;

    if let Err(error) = first_bloods {
        tracing::error!("{:#?}", error);
        let html = state
            .jinja
            .get_template("challenge-submit.html")
            .unwrap()
            .render(context! {
                lang => lang,
                error => state.localizer.localize(&lang, "unknown-error", None),
            })
            .unwrap();
        return Response::builder()
            .header("content-type", "text/html")
            .body(html)
            .unwrap();
    }

    if state
        .settings
        .read()
        .await
        .discord
        .first_blood_channel_id
        .is_some()
    {
        let first_bloods = first_bloods.unwrap();

        if !first_bloods.division_ids.is_empty() {
            let team = state.db.get_team_from_id(user.team_id).await.unwrap();
            _ = state
                .bot
                .send_first_blood(
                    &user,
                    &team,
                    challenge,
                    &challenge_data.divisions,
                    &challenge_data.categories,
                    &first_bloods,
                )
                .await;
            tracing::info!(
                user_id = user.id,
                challenge_id = challenge.id,
                divisions = first_bloods
                    .division_ids
                    .iter()
                    .map(|n| n.to_string())
                    .collect::<Vec<String>>()
                    .join(","),
                "First blooded"
            );
        }
    }

    Response::builder()
        .header("Content-Type", "text/html")
        .header(
            "HX-Trigger",
            json!({
                "manualRefresh": true,
                "closeModal": true,
            })
            .to_string(),
        )
        .body(format!(
            r#"<div id="htmx-toaster" data-toast="success" hx-swap-oob="true">{}</div>"#,
            state
                .localizer
                .localize(&lang, "challenges-challenge-solved", None)
                .unwrap(),
        ))
        .unwrap()
}

#[derive(Deserialize)]
pub struct SubmitWriteup {
    url: String,
}

pub async fn route_writeup_submit(
    state: State<RouterState>,
    Extension(user): Extension<User>,
    Extension(lang): Extension<Languages>,
    challenge_id: Path<i64>,
    Form(form): Form<SubmitWriteup>,
) -> impl IntoResponse {
    if form.url.len() > 256 {
        let html = state
            .jinja
            .get_template("challenge-submit.html")
            .unwrap()
            .render(context! {
                lang => lang,
                user => user,
                error => state.localizer.localize(&lang, "error-writeup-url-too-long", None)
            })
            .unwrap();

        return Response::builder()
            .header("content-type", "text/html")
            .body(html)
            .unwrap();
    }

    let url = reqwest::Url::parse(&form.url);
    if url.is_err() {
        let html = state
            .jinja
            .get_template("challenge-submit.html")
            .unwrap()
            .render(context! {
                lang => lang,
                user => user,
                error => state.localizer.localize(&lang, "challenges-error-writeup-invalid-url", None),
            })
            .unwrap();

        return Response::builder()
            .header("content-type", "text/html")
            .body(html)
            .unwrap();
    }

    let url = url.unwrap();

    let client = reqwest::Client::new();
    let response = client
        .request(reqwest::Method::GET, url)
        .timeout(Duration::from_secs(8))
        .send()
        .await;

    if response.is_err() {
        let html = state
            .jinja
            .get_template("challenge-submit.html")
            .unwrap()
            .render(context! {
                lang => lang,
                user => user,
                error => "Unknown error",
            })
            .unwrap();

        return Response::builder()
            .header("content-type", "text/html")
            .body(html)
            .unwrap();
    }

    let response = response.unwrap();

    if !response.status().is_success() {
        let html = state
            .jinja
            .get_template("challenge-submit.html")
            .unwrap()
            .render(context! {
                lang => lang,
                user => user,
                error => state.localizer.localize(&lang, "challenges-error-writeup-server-error", None),
            })
            .unwrap();

        return Response::builder()
            .header("content-type", "text/html")
            .body(html)
            .unwrap();
    }

    state
        .db
        .add_writeup(user.id, user.team_id, challenge_id.0, &form.url)
        .await
        .unwrap();

    Response::builder()
        .header("Content-Type", "text/html")
        .header("HX-Trigger", "manualRefresh, closeModal")
        .body("".to_owned())
        .unwrap()
}

pub async fn route_writeup_delete(
    state: State<RouterState>,
    Extension(user): Extension<User>,
    challenge_id: Path<i64>,
) -> impl IntoResponse {
    state
        .db
        .delete_writeup(challenge_id.0, user.id, user.team_id)
        .await
        .unwrap();

    Response::builder()
        .header("Content-Type", "text/html")
        .header("HX-Trigger", "manualRefresh, closeModal")
        .body("".to_owned())
        .unwrap()
}
