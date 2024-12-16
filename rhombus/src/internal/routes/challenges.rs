use std::{cmp::max, sync::LazyLock, time::Duration};

use axum::{
    extract::{Path, State},
    http::Uri,
    response::{Html, IntoResponse, Response},
    Extension, Form, Json,
};
use chrono::{DateTime, Utc};
use dashmap::DashMap;
use minijinja::context;
use serde::Deserialize;
use serde_json::{json, Value};

use crate::internal::{
    auth::User,
    database::provider::{Challenge, Team},
    router::RouterState,
    routes::meta::PageMeta,
    templates::{base64_encode, toast_header, ToastKind},
};

pub async fn route_challenges(
    state: State<RouterState>,
    Extension(user): Extension<User>,
    Extension(page): Extension<PageMeta>,
    uri: Uri,
) -> impl IntoResponse {
    if let Some(start_time) = state.settings.read().await.start_time {
        if !user.is_admin && chrono::Utc::now() < start_time {
            let html = state
                .jinja
                .get_template("challenges/locked.html")
                .unwrap()
                .render(context! {
                    global => state.global_page_meta,
                    page,
                    title => format!("Challenges | {}", state.global_page_meta.title),
                    user,
                })
                .unwrap();

            return Response::builder()
                .header("content-type", "text/html")
                .status(200)
                .body(html)
                .unwrap()
                .into_response();
        }
    }

    let challenge_data = state.db.get_challenges();
    let team = state.db.get_team_from_id(user.team_id);
    let (challenge_data, team) = tokio::join!(challenge_data, team);
    let challenge_data = challenge_data.unwrap();
    let team = team.unwrap();

    let ticket_enabled = {
        let settings = state.settings.read().await;
        settings
            .discord
            .as_ref()
            .and_then(|d| d.support_channel_id)
            .is_some()
    };

    let challenge_json = json!({
        "division_id": team.division_id,
        "ticket_enabled": ticket_enabled,
        "challenges": challenge_data.challenges.values().map(|challenge| json!({
            "id": challenge.id,
            "name": challenge.name,
            "description": challenge.description,
            "health": if let (Some(healthy), Some(last_checked)) = (challenge.healthy, challenge.last_healthcheck) {
                Some(json!({
                    "last_checked": last_checked,
                    "healthy": healthy,
                }))
            } else {
                None
            },
            "points": challenge.points,
            "category_id": challenge.category_id,
            "author_id": challenge.author_id,
            "division_solves": challenge.division_solves.iter().map(|(division_id, solves)| json!({
                "division_id": division_id,
                "solves": solves,
            })).collect::<serde_json::Value>(),
            "attachments": challenge.attachments.iter().map(|attachment| json!({
                "name": attachment.name,
                "url": attachment.url,
            })).collect::<serde_json::Value>(),
        })).collect::<serde_json::Value>(),
        "categories": challenge_data.categories.values().map(|category| json!({
            "id": category.id,
            "name": category.name,
            "color": category.color,
        })).collect::<serde_json::Value>(),
        "authors": challenge_data.authors.values().map(|author|
            (author.id.clone(), json!({
                "name": author.name,
                "avatar_url": author.avatar_url,
            }))
        ).collect::<serde_json::Value>(),
        "divisions": challenge_data.divisions.values().map(|division|
            (division.id.clone(), json!({
                "name": division.name,
            }))
        ).collect::<serde_json::Value>(),
        "team": json!({
            "users": team.users.iter().map(|user|
                (user.0.to_string(), json!({
                    "name": user.1.name,
                    "avatar_url": user.1.avatar_url,
                }))
            ).collect::<serde_json::Value>(),
            "solves": team.solves.iter().map(|(challenge_id, solve)|
                (challenge_id.to_string(), json!({
                    "solved_at": solve.solved_at,
                    "user_id": solve.user_id,
                    "points": solve.points,
                }))
            ).collect::<serde_json::Value>(),
        })
    });

    if uri.path().ends_with(".json") {
        return Json(challenge_json).into_response();
    }

    let html = state
        .jinja
        .get_template("challenges/challenges.html")
        .unwrap()
        .render(context! {
            global => state.global_page_meta,
            page,
            title => format!("Challenges | {}", state.global_page_meta.title),
            user,
            challenge_json,
        })
        .unwrap();

    Html(html).into_response()
}

#[async_trait::async_trait]
pub trait ChallengeFlag {
    async fn correct_flag(
        &self,
        challenge: &Challenge,
        flag: &str,
    ) -> std::result::Result<bool, String>;
}

pub struct ExactFlag;

#[async_trait::async_trait]
impl ChallengeFlag for ExactFlag {
    async fn correct_flag(
        &self,
        challenge: &Challenge,
        flag: &str,
    ) -> std::result::Result<bool, String> {
        Ok(challenge.flag.trim() == flag.trim())
    }
}

#[async_trait::async_trait]
pub trait ChallengePoints {
    async fn initial(&self, metadata: &Value) -> crate::Result<i64>;
    async fn next(&self, user: &User, team: &Team, challenge: &Challenge) -> crate::Result<i64>;
}

pub struct DynamicPoints;

#[async_trait::async_trait]
impl ChallengePoints for DynamicPoints {
    async fn initial(&self, metadata: &Value) -> crate::Result<i64> {
        let initial = metadata["dynamic"]["initial"].as_i64().unwrap_or(500);

        Ok(initial)
    }

    async fn next(&self, _user: &User, _team: &Team, challenge: &Challenge) -> crate::Result<i64> {
        let initial = challenge.metadata["dynamic"]["initial"]
            .as_f64()
            .unwrap_or(500.);
        let minimum = challenge.metadata["dynamic"]["minimum"]
            .as_f64()
            .unwrap_or(100.);
        let decay = challenge.metadata["dynamic"]["decay"]
            .as_f64()
            .unwrap_or(100.);

        let total_solves = challenge.division_solves.values().sum::<u64>() as f64;

        let solves = total_solves + 1.;
        let points = max(
            (((minimum - initial) / (decay * decay) * (solves * solves)) + initial).ceil() as i64,
            minimum as i64,
        );

        Ok(points)
    }
}

pub struct StaticPoints;

#[async_trait::async_trait]
impl ChallengePoints for StaticPoints {
    async fn initial(&self, metadata: &Value) -> crate::Result<i64> {
        let points = metadata["points"].as_i64().unwrap_or(100);

        Ok(points)
    }

    async fn next(&self, _user: &User, _team: &Team, challenge: &Challenge) -> crate::Result<i64> {
        let Some(points) = challenge.metadata["points"].as_i64() else {
            tracing::error!(
                challenge_id = challenge.id,
                "Static scoring used but no points specified. Defaulting to 100 points",
            );
            return Ok(100);
        };

        Ok(points)
    }
}

pub async fn route_challenge_view(
    state: State<RouterState>,
    Extension(user): Extension<User>,
    Extension(page): Extension<PageMeta>,
    Path(challenge_id): Path<String>,
) -> impl IntoResponse {
    if let Some(start_time) = state.settings.read().await.start_time {
        if !user.is_admin && chrono::Utc::now() < start_time {
            return Response::builder()
                .header("content-type", "text/html")
                .status(403)
                .body("CTF not started yet".to_owned())
                .unwrap()
                .into_response();
        }
    }

    let challenge_data = state.db.get_challenges();
    let team = state.db.get_team_from_id(user.team_id);
    let user_writeups = state.db.get_writeups_from_user_id(user.id);
    let (challenge_data, team, user_writeups) = tokio::join!(challenge_data, team, user_writeups);
    let challenge_data = challenge_data.unwrap();
    let team = team.unwrap();
    let user_writeups = user_writeups.unwrap();

    let challenge = challenge_data.challenges.get(&challenge_id).unwrap();
    let category = challenge_data
        .categories
        .get(&challenge.category_id)
        .unwrap();

    Html(
        state
            .jinja
            .get_template("challenges/challenge.html")
            .unwrap()
            .render(context! {
                global => state.global_page_meta,
                page,
                user,
                challenge,
                category,
                team,
                divisions => challenge_data.divisions,
                user_writeups,
            })
            .unwrap(),
    )
    .into_response()
}

pub async fn route_ticket_view(
    state: State<RouterState>,
    Extension(user): Extension<User>,
    Extension(page): Extension<PageMeta>,
    Path(challenge_id): Path<String>,
) -> impl IntoResponse {
    if let Some(start_time) = state.settings.read().await.start_time {
        if !user.is_admin && chrono::Utc::now() < start_time {
            return Response::builder()
                .header("content-type", "text/html")
                .status(403)
                .body("CTF not started yet".to_owned())
                .unwrap()
                .into_response();
        }
    }

    let lasted_ticket_opened_at = state
        .db
        .get_last_created_ticket_time(user.id)
        .await
        .unwrap()
        .unwrap_or(DateTime::<Utc>::from_timestamp(0, 0).unwrap());

    let next_allowed_ticket_at = lasted_ticket_opened_at + Duration::from_secs(60 * 5);
    if Utc::now() < next_allowed_ticket_at {
        let minutes_until = (next_allowed_ticket_at - Utc::now()).num_minutes() + 1;
        return Response::builder()
            .header(
                "HX-Trigger",
                toast_header(
                    ToastKind::Error,
                    &format!(
                        "You must wait {} minute{} before submitting another ticket.",
                        minutes_until,
                        if minutes_until == 1 { "" } else { "s" }
                    ),
                ),
            )
            .body("".to_owned())
            .unwrap()
            .into_response();
    }

    let challenge_data = state.db.get_challenges();
    let team = state.db.get_team_from_id(user.team_id);
    let (challenge_data, team) = tokio::join!(challenge_data, team);
    let challenge_data = challenge_data.unwrap();
    let team = team.unwrap();

    let challenge = challenge_data.challenges.get(&challenge_id).unwrap();
    let category = challenge_data
        .categories
        .get(&challenge.category_id)
        .unwrap();

    let ticket_template = if let Some(ticket_template) = &challenge.ticket_template {
        ticket_template.clone()
    } else {
        state.settings.read().await.default_ticket_template.clone()
    };

    Html(
        state
            .jinja
            .get_template("challenges/ticket.html")
            .unwrap()
            .render(context! {
                global => state.global_page_meta,
                page,
                user,
                challenge,
                category,
                team,
                ticket_template,
            })
            .unwrap(),
    )
    .into_response()
}

#[derive(Deserialize)]
pub struct TicketSubmit {
    content: String,
}

pub async fn route_ticket_submit(
    state: State<RouterState>,
    Extension(user): Extension<User>,
    Extension(page): Extension<PageMeta>,
    Path(challenge_id): Path<String>,
    Form(form): Form<TicketSubmit>,
) -> impl IntoResponse {
    if let Some(start_time) = state.settings.read().await.start_time {
        if !user.is_admin && chrono::Utc::now() < start_time {
            return Response::builder()
                .header("content-type", "text/html")
                .status(403)
                .body("CTF not started yet".to_owned())
                .unwrap()
                .into_response();
        }
    }

    let ticket_enabled = {
        let settings = state.settings.read().await;
        settings
            .discord
            .as_ref()
            .and_then(|d| d.support_channel_id)
            .is_some()
    };

    if !ticket_enabled || state.bot.is_none() {
        return Response::builder()
            .header("Content-Type", "text/html")
            .header("HX-Trigger", "closeModal")
            .body("".to_owned())
            .unwrap()
            .into_response();
    }

    let lasted_ticket_opened_at = state
        .db
        .get_last_created_ticket_time(user.id)
        .await
        .unwrap()
        .unwrap_or(DateTime::<Utc>::from_timestamp(0, 0).unwrap());

    let next_allowed_ticket_at = lasted_ticket_opened_at + Duration::from_secs(60 * 5);
    if Utc::now() < next_allowed_ticket_at {
        return Json(json!({
            "error": "Too many tickets in a short period of time",
        }))
        .into_response();
    }

    let content = form.content;

    if content.len() > 1000 {
        let html = state
            .jinja
            .get_template("challenges/challenge-submit.html")
            .unwrap()
            .render(context! {
                page,
                user,
                error => state.localizer.localize(&page.lang, "challenges-error-ticket-too-long", None),
            })
            .unwrap();

        return Response::builder()
            .header("content-type", "text/html")
            .body(html)
            .unwrap()
            .into_response();
    }

    let challenge_data = state.db.get_challenges();
    let team = state.db.get_team_from_id(user.team_id);
    let (challenge_data, team) = tokio::join!(challenge_data, team);
    let challenge_data = challenge_data.unwrap();
    let team = team.unwrap();

    let challenge = challenge_data.challenges.get(&challenge_id).unwrap();

    let author = challenge_data.authors.get(&challenge.author_id).unwrap();

    state
        .bot
        .as_ref()
        .unwrap()
        .create_support_thread(&user, &team, challenge, author, content.as_str())
        .await
        .unwrap();

    Response::builder()
        .header("Content-Type", "text/html")
        .header(
            "HX-Trigger",
            json!({
                "closeModal": true,
                "toast": {
                    "kind": "success",
                    "message": base64_encode(&state.localizer.localize(&page.lang, "challenges-ticket-submitted", None).unwrap())
                }
            })
            .to_string(),
        )
        .body("".to_owned())
        .unwrap()
        .into_response()
}

pub static TEAM_BURSTED_POINTS: LazyLock<DashMap<i64, i64>> = LazyLock::new(DashMap::new);

#[derive(Deserialize)]
pub struct SubmitChallenge {
    flag: String,
}

pub async fn route_challenge_submit(
    state: State<RouterState>,
    Extension(user): Extension<User>,
    Extension(page): Extension<PageMeta>,
    Path(challenge_id): Path<String>,
    Form(form): Form<SubmitChallenge>,
) -> impl IntoResponse {
    let now = chrono::Utc::now();
    if let Some(start_time) = state.settings.read().await.start_time {
        if !user.is_admin && now < start_time {
            return Response::builder()
                .header("content-type", "text/html")
                .status(403)
                .body("CTF not started yet".to_owned())
                .unwrap();
        }
    }

    let challenge_data = state.db.get_challenges().await.unwrap();
    let challenge = challenge_data.challenges.get(&challenge_id).unwrap();

    let correct_flag = if let Some(custom) = state.flag_fn_map.lock().await.get(&challenge_id) {
        custom.correct_flag(challenge, &form.flag).await
    } else {
        ExactFlag.correct_flag(challenge, &form.flag).await
    };

    match correct_flag {
        Ok(true) => (),
        Ok(false) => {
            let html = state
                .jinja
                .get_template("challenges/challenge-submit.html")
                .unwrap()
                .render(context! {
                    page,
                    error => state.localizer.localize(&page.lang, "challenges-error-incorrect-flag", None),
                })
                .unwrap();
            return Response::builder()
                .header("content-type", "text/html")
                .body(html)
                .unwrap();
        }
        Err(error) => {
            let html = state
                .jinja
                .get_template("challenges/challenge-submit.html")
                .unwrap()
                .render(context! {
                    page,
                    error,
                })
                .unwrap();
            return Response::builder()
                .header("content-type", "text/html")
                .body(html)
                .unwrap();
        }
    }

    if let Some(end_time) = state.settings.read().await.end_time {
        if now > end_time {
            let html = state
                .jinja
                .get_template("challenges/challenge-submit.html")
                .unwrap()
                .render(context! {
                    page,
                    error => "CTF has ended (correct flag!)",
                })
                .unwrap();

            return Response::builder()
                .header("content-type", "text/html")
                .body(html)
                .unwrap();
        }
    }

    let num_solves = TEAM_BURSTED_POINTS
        .get(&user.team_id)
        .map(|v| *v.value())
        .unwrap_or(0);

    if num_solves >= 3 {
        let html = state
            .jinja
            .get_template("challenges/challenge-submit.html")
            .unwrap()
            .render(context! {
                page,
                error => "Too many solves in a short period of time. Please try again in a few minutes",
            })
            .unwrap();

        return Response::builder()
            .header("content-type", "text/html")
            .body(html)
            .unwrap();
    }

    let team = state.db.get_team_from_id(user.team_id).await.unwrap();

    let next_points = state
        .score_type_map
        .lock()
        .await
        .get(challenge.score_type.as_str())
        .unwrap()
        .next(&user, &team, challenge)
        .await
        .unwrap_or_else(|error| {
            let total_solves = challenge.division_solves.values().sum::<u64>();

            tracing::error!(
                challenge_id = challenge.id,
                user_id = user.id,
                team_id = user.team_id,
                score_type = challenge.score_type,
                division_solves = ?challenge.division_solves,
                total_solves,
                previous_points=challenge.points,
                ?error,
                "Failed to calculate points for challenge after solve. Defaulting to previous value"
            );
            challenge.points
        });

    let first_blooded = challenge.division_solves[&team.division_id] == 0;

    if let Err(error) = state
        .db
        .solve_challenge(
            user.id,
            team.id,
            &team.division_id,
            challenge,
            next_points,
            now,
        )
        .await
    {
        tracing::error!("{:#?}", error);
        let html = state
            .jinja
            .get_template("challenges/challenge-submit.html")
            .unwrap()
            .render(context! {
                page,
                error => state.localizer.localize(&page.lang, "unknown-error", None),
            })
            .unwrap();
        return Response::builder()
            .header("content-type", "text/html")
            .body(html)
            .unwrap();
    }

    TEAM_BURSTED_POINTS
        .entry(user.team_id)
        .and_modify(|v| *v += 1)
        .or_insert(1);

    if let Some(ref bot) = state.bot {
        {
            let bot = bot.clone();
            let db = state.db.clone();
            let user_id = user.id;
            let challenge_id = challenge.id.clone();
            tokio::task::spawn(async move {
                if let Ok(to_be_closed_tickets) = db
                    .close_tickets_for_challenge(user_id, &challenge_id, now)
                    .await
                {
                    if bot.close_tickets(&to_be_closed_tickets).await.is_err() {
                        tracing::error!(user_id, challenge_id, "Failed to close tickets on solve");
                    }
                }

                bot.sync_top10_discord_role().await;
            });
        }

        let first_blood_enabled = {
            let settings = state.settings.read().await;
            settings
                .discord
                .as_ref()
                .and_then(|d| d.first_blood_channel_id)
                .is_some()
        };

        if first_blood_enabled && first_blooded {
            if let Err(error) = bot
                .send_first_blood(&user, &team, challenge, &challenge_data)
                .await
            {
                tracing::error!(
                    user_id = user.id,
                    team_id = user.team_id,
                    challenge_id = challenge.id,
                    division_id = team.division_id,
                    error = ?error,
                    "First blood failed to send",
                );
            } else {
                tracing::info!(
                    user_id = user.id,
                    team_id = user.team_id,
                    challenge_id = challenge.id,
                    division_id = team.division_id,
                    "First blooded"
                );
            }
        }
    }

    Response::builder()
        .header("Content-Type", "text/html")
        .header(
            "HX-Trigger",
            json!({
                "manualRefresh": true,
                "closeModal": true,
                "toast": {
                    "kind": "success",
                    "message": base64_encode(&state.localizer.localize(&page.lang, "challenges-challenge-solved", None).unwrap())
                }
            })
            .to_string(),
        )
        .body("".to_owned())
        .unwrap()
}

#[derive(Deserialize)]
pub struct SubmitWriteup {
    url: String,
}

pub async fn route_writeup_submit(
    state: State<RouterState>,
    Extension(user): Extension<User>,
    Extension(page): Extension<PageMeta>,
    challenge_id: Path<i64>,
    Form(form): Form<SubmitWriteup>,
) -> impl IntoResponse {
    if let Some(start_time) = state.settings.read().await.start_time {
        if !user.is_admin && chrono::Utc::now() < start_time {
            return Response::builder()
                .header("content-type", "text/html")
                .status(403)
                .body("CTF not started yet".to_owned())
                .unwrap();
        }
    }

    if form.url.len() > 256 {
        let html = state
            .jinja
            .get_template("challenges/challenge-submit.html")
            .unwrap()
            .render(context! {
                page,
                user,
                error => state.localizer.localize(&page.lang, "error-writeup-url-too-long", None)
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
            .get_template("challenges/challenge-submit.html")
            .unwrap()
            .render(context! {
                page,
                user,
                error => state.localizer.localize(&page.lang, "challenges-error-writeup-invalid-url", None),
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
            .get_template("challenges/challenge-submit.html")
            .unwrap()
            .render(context! {
                page,
                user,
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
            .get_template("challenges/challenge-submit.html")
            .unwrap()
            .render(context! {
                page,
                user,
                error => state.localizer.localize(&page.lang, "challenges-error-writeup-server-error", None),
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
    if let Some(start_time) = state.settings.read().await.start_time {
        if !user.is_admin && chrono::Utc::now() < start_time {
            return Response::builder()
                .header("content-type", "text/html")
                .status(403)
                .body("CTF not started yet".to_owned())
                .unwrap();
        }
    }

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
