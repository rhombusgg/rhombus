use std::{cmp::max, sync::LazyLock, time::Duration};

use axum::{
    extract::{Path, Query, State},
    http::Extensions,
    response::{Html, IntoResponse, Response},
    Extension, Form,
};
use chrono::{DateTime, Utc};
use dashmap::DashMap;
use minijinja::context;
use reqwest::StatusCode;
use serde::Deserialize;
use serde_json::{json, Value};

use crate::internal::{
    auth::User,
    database::provider::{Challenge, Team},
    errors::IntoErrorResponse,
    router::RouterState,
    routes::meta::PageMeta,
    templates::{base64_encode, toast_header, ToastKind},
};

pub async fn route_challenges(
    State(state): State<RouterState>,
    Extension(user): Extension<User>,
    Extension(page): Extension<PageMeta>,
    extensions: Extensions,
) -> std::result::Result<impl IntoResponse, Response> {
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

            return Ok(Html(html).into_response());
        }
    }

    let challenge_data = state.db.get_challenges();
    let team = state.db.get_team_from_id(user.team_id);
    let (challenge_data, team) =
        tokio::try_join!(challenge_data, team).map_err_page(&extensions, "Failed to get data")?;

    let ticket_enabled = {
        let settings = state.settings.read().await;
        settings
            .discord
            .as_ref()
            .and_then(|d| d.support_channel_id)
            .is_some()
    };

    let html = state
        .jinja
        .get_template("challenges/challenges.html")
        .unwrap()
        .render(context! {
            global => state.global_page_meta,
            page,
            title => format!("Challenges | {}", state.global_page_meta.title),
            user,
            team,
            ticket_enabled,
            challenge_data,
        })
        .unwrap();

    Ok(Html(html).into_response())
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

        let solves = (challenge.division_solves.values().sum::<u64>() + 1) as f64;

        let points = max(
            (((minimum - initial) / (decay * decay) * (solves * solves)) + initial).ceil() as i64,
            minimum as i64,
        );

        tracing::info!(solves, points, challenge_id = challenge.id, "next");

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

#[derive(Deserialize)]
pub struct ChallengeParams {
    page: Option<u64>,
}

pub async fn route_challenge_view(
    State(state): State<RouterState>,
    Extension(user): Extension<User>,
    Extension(page): Extension<PageMeta>,
    Path(challenge_id): Path<String>,
    Query(params): Query<ChallengeParams>,
    extensions: Extensions,
) -> std::result::Result<impl IntoResponse, Response> {
    if let Some(start_time) = state.settings.read().await.start_time {
        if !user.is_admin && chrono::Utc::now() < start_time {
            return Err((StatusCode::FORBIDDEN, "CTF not started yet").into_response());
        }
    }

    let page_num: u64 = params.page.unwrap_or(1).saturating_sub(1);
    const PAGE_SIZE: u64 = 10;

    let challenge_data = state.db.get_challenges();
    let team = state.db.get_team_from_id(user.team_id);
    let user_writeups = state.db.get_writeups_from_user_id(user.id);
    let global_solves =
        state
            .db
            .get_challenge_solves(&challenge_id, page_num * PAGE_SIZE, PAGE_SIZE);
    let (challenge_data, team, user_writeups, global_solves) =
        tokio::try_join!(challenge_data, team, user_writeups, global_solves)
            .map_err_htmx(&extensions, "Failed to get data")?;

    let challenge = challenge_data
        .challenges
        .get(&challenge_id)
        .map_err_htmx(&extensions, "Challenge not found")?;

    let category = challenge_data
        .categories
        .get(&challenge.category_id)
        .unwrap();
    let num_pages = global_solves.total.div_ceil(PAGE_SIZE);
    let page_num = page_num.min(num_pages);

    let now = chrono::Utc::now();

    Ok(Html(
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
                global_solves,
                page_num,
                num_pages,
                now,
            })
            .unwrap(),
    )
    .into_response())
}

pub async fn route_ticket_view(
    State(state): State<RouterState>,
    Extension(user): Extension<User>,
    Extension(page): Extension<PageMeta>,
    Path(challenge_id): Path<String>,
    extensions: Extensions,
) -> std::result::Result<impl IntoResponse, Response> {
    if let Some(start_time) = state.settings.read().await.start_time {
        if !user.is_admin && chrono::Utc::now() < start_time {
            return Err((StatusCode::FORBIDDEN, "CTF not started yet").into_response());
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
        return Err((
            StatusCode::TOO_MANY_REQUESTS,
            ([(
                "HX-Trigger",
                toast_header(
                    ToastKind::Error,
                    &format!(
                        "You must wait {} minute{} before submitting another ticket.",
                        minutes_until,
                        if minutes_until == 1 { "" } else { "s" }
                    ),
                ),
            )]),
        )
            .into_response());
    }

    let challenge_data = state.db.get_challenges();
    let team = state.db.get_team_from_id(user.team_id);
    let (challenge_data, team) =
        tokio::try_join!(challenge_data, team).map_err_htmx(&extensions, "Failed to get data")?;

    let challenge = challenge_data
        .challenges
        .get(&challenge_id)
        .map_err_htmx(&extensions, "Challenge not found")?;

    let category = challenge_data
        .categories
        .get(&challenge.category_id)
        .unwrap();

    let ticket_template = if let Some(ticket_template) = &challenge.ticket_template {
        ticket_template
    } else {
        &state.settings.read().await.default_ticket_template
    };

    Ok(Html(
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
    ))
}

#[derive(Deserialize)]
pub struct TicketSubmit {
    content: String,
}

pub async fn route_ticket_submit(
    State(state): State<RouterState>,
    Extension(user): Extension<User>,
    Extension(page): Extension<PageMeta>,
    Path(challenge_id): Path<String>,
    extensions: Extensions,
    Form(form): Form<TicketSubmit>,
) -> std::result::Result<impl IntoResponse, Response> {
    if let Some(start_time) = state.settings.read().await.start_time {
        if !user.is_admin && chrono::Utc::now() < start_time {
            return Err((StatusCode::FORBIDDEN, "CTF not started yet").into_response());
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
        return Err(([("HX-Trigger", "closeModal")]).into_response());
    }

    let lasted_ticket_opened_at = state
        .db
        .get_last_created_ticket_time(user.id)
        .await
        .map_err_htmx(&extensions, "Failed to get last ticket time")?
        .unwrap_or(DateTime::<Utc>::from_timestamp(0, 0).unwrap());

    let next_allowed_ticket_at = lasted_ticket_opened_at + Duration::from_secs(60 * 5);
    if Utc::now() < next_allowed_ticket_at {
        return Err((
            StatusCode::TOO_MANY_REQUESTS,
            [(
                "HX-Trigger",
                json!({
                    "closeModal": true,
                    "toast": {
                        "kind": "error",
                        "message": base64_encode("Too many tickets in a short period of time"),
                    }
                })
                .to_string(),
            )],
        )
            .into_response());
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

        return Ok(Html(html).into_response());
    }

    let challenge_data = state.db.get_challenges();
    let team = state.db.get_team_from_id(user.team_id);
    let (challenge_data, team) =
        tokio::try_join!(challenge_data, team).map_err_htmx(&extensions, "Failed to get data")?;

    let challenge = challenge_data
        .challenges
        .get(&challenge_id)
        .map_err_htmx(&extensions, "Failed to get challenge")?;

    let author = challenge_data.authors.get(&challenge.author_id).unwrap();

    state
        .bot
        .as_ref()
        .unwrap()
        .create_support_thread(&user, &team, challenge, author, content.as_str())
        .await
        .map_err_htmx(&extensions, "Failed to create ticket in Discord")?;

    Ok(([(
        "HX-Trigger",
        json!({
            "closeModal": true,
            "toast": {
                "kind": "success",
                "message": base64_encode(&state.localizer.localize(&page.lang, "challenges-ticket-submitted", None).unwrap()),
            }
        })
        .to_string(),
    )])
    .into_response())
}

pub static TEAM_BURSTED_POINTS: LazyLock<DashMap<i64, i64>> = LazyLock::new(DashMap::new);

#[derive(Deserialize)]
pub struct SubmitChallenge {
    flag: String,
}

pub async fn route_challenge_submit(
    State(state): State<RouterState>,
    Extension(user): Extension<User>,
    Extension(page): Extension<PageMeta>,
    Path(challenge_id): Path<String>,
    Form(form): Form<SubmitChallenge>,
) -> impl IntoResponse {
    let now = chrono::Utc::now();
    if let Some(start_time) = state.settings.read().await.start_time {
        if !user.is_admin && now < start_time {
            return (StatusCode::FORBIDDEN, "CTF not started yet").into_response();
        }
    }

    let _ = state.solve_lock.lock().await;

    let challenge_data = match state.db.get_challenges().await {
        Ok(challenge_data) => challenge_data,
        Err(e) => {
            tracing::error!(error = ?e, user_id=user.id, "Failed to get challenges");
            let html = state
                .jinja
                .get_template("challenges/challenge-submit.html")
                .unwrap()
                .render(context! {
                    page,
                    error => state.localizer.localize(&page.lang, "unknown-error", None),
                })
                .unwrap();
            return Html(html).into_response();
        }
    };

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
            return Html(html).into_response();
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
            return Html(html).into_response();
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

            return Html(html).into_response();
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

        return Html(html).into_response();
    }

    let team = match state.db.get_team_from_id(user.team_id).await {
        Ok(team) => team,
        Err(e) => {
            tracing::error!(error = ?e, user_id=user.id, "Failed to get team");
            let html = state
                .jinja
                .get_template("challenges/challenge-submit.html")
                .unwrap()
                .render(context! {
                    page,
                    error => state.localizer.localize(&page.lang, "unknown-error", None),
                })
                .unwrap();
            return Html(html).into_response();
        }
    };

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

    if let Err(e) = state
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
        tracing::error!(error = ?e, user_id=user.id, team_id=team.id, "Failed to solve challenge");
        let html = state
            .jinja
            .get_template("challenges/challenge-submit.html")
            .unwrap()
            .render(context! {
                page,
                error => state.localizer.localize(&page.lang, "unknown-error", None),
            })
            .unwrap();
        return Html(html).into_response();
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
                match db
                    .close_tickets_for_challenge(user_id, &challenge_id, now)
                    .await
                {
                    Ok(to_be_closed_tickets) => {
                        if let Err(e) = bot.close_tickets(&to_be_closed_tickets).await {
                            tracing::error!(
                                user_id,
                                challenge_id,
                                error = ?e,
                                "Failed to close tickets on solve"
                            );
                        }
                    }
                    Err(e) => {
                        tracing::error!(
                            user_id,
                            challenge_id,
                            error = ?e,
                            "Failed to close tickets on solve"
                        );
                    }
                };

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

    (
        [("HX-Trigger",
            json!({
                "manualRefresh": true,
                "closeModal": true,
                "toast": {
                    "kind": "success",
                    "message": base64_encode(&state.localizer.localize(&page.lang, "challenges-challenge-solved", None).unwrap())
                }
            })
            .to_string(),
        )],
    ).into_response()
}

#[derive(Deserialize)]
pub struct SubmitWriteup {
    url: String,
}

pub async fn route_writeup_submit(
    State(state): State<RouterState>,
    Extension(user): Extension<User>,
    Extension(page): Extension<PageMeta>,
    Path(challenge_id): Path<i64>,
    Form(form): Form<SubmitWriteup>,
) -> impl IntoResponse {
    if let Some(start_time) = state.settings.read().await.start_time {
        if !user.is_admin && chrono::Utc::now() < start_time {
            return (StatusCode::FORBIDDEN, "CTF not started yet").into_response();
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

        return Html(html).into_response();
    }

    let url = match reqwest::Url::parse(&form.url) {
        Ok(url) => url,
        Err(_) => {
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

            return Html(html).into_response();
        }
    };

    let client = reqwest::Client::new();
    let response = match client
        .request(reqwest::Method::GET, url)
        .timeout(Duration::from_secs(8))
        .send()
        .await
    {
        Ok(response) => response,
        Err(_) => {
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

            return Html(html).into_response();
        }
    };

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

        return Html(html).into_response();
    }

    if let Err(e) = state
        .db
        .add_writeup(user.id, user.team_id, challenge_id, &form.url)
        .await
    {
        tracing::error!(error = ?e, user_id=user.id, team_id=user.team_id, challenge_id, "Failed to add writeup");
        let html = state
            .jinja
            .get_template("challenges/challenge-submit.html")
            .unwrap()
            .render(context! {
                page,
                user,
                error => state.localizer.localize(&page.lang, "unknown-error", None),
            })
            .unwrap();

        return Html(html).into_response();
    };

    ([("HX-Trigger", "manualRefresh, closeModal")]).into_response()
}

pub async fn route_writeup_delete(
    State(state): State<RouterState>,
    Extension(user): Extension<User>,
    Path(challenge_id): Path<i64>,
) -> impl IntoResponse {
    if let Some(start_time) = state.settings.read().await.start_time {
        if !user.is_admin && chrono::Utc::now() < start_time {
            return (StatusCode::FORBIDDEN, "CTF not started yet").into_response();
        }
    }

    if let Err(e) = state
        .db
        .delete_writeup(challenge_id, user.id, user.team_id)
        .await
    {
        tracing::error!(error = ?e, user_id=user.id, team_id=user.team_id, challenge_id, "Failed to delete writeup");
    }

    ([("HX-Trigger", "manualRefresh, closeModal")]).into_response()
}
