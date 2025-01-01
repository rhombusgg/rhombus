use axum::{
    body::Body,
    extract::{Path, Query, Request, State},
    http::Uri,
    response::{Html, IntoResponse, Redirect, Response},
    Extension, Json,
};
use minijinja::context;
use reqwest::StatusCode;
use serde::Deserialize;
use serde_json::json;

use crate::internal::{
    auth::MaybeUser, errors::IntoErrorResponse, router::RouterState, routes::meta::PageMeta,
};

pub async fn route_scoreboard(
    State(state): State<RouterState>,
    Extension(user): Extension<MaybeUser>,
    Extension(page): Extension<PageMeta>,
    Query(params): Query<PageParams>,
    uri: Uri,
    req: Request<Body>,
) -> std::result::Result<Response, Response> {
    let challenge_data = state
        .db
        .get_challenges()
        .await
        .map_err_page(&req, "Failed to get challenge data")?;
    let default_division = challenge_data
        .divisions
        .keys()
        .next()
        .map_err_page(&req, "Failed to get default division")?;

    if challenge_data.divisions.len() == 1 {
        return route_scoreboard_division(
            State(state),
            Extension(user),
            Extension(page),
            Path(default_division.to_string()),
            Query(params),
            uri,
            req,
        )
        .await;
    }

    Ok(Redirect::temporary(
        format!(
            "/scoreboard/{}{}",
            default_division,
            if uri.path().ends_with(".json") {
                ".json"
            } else {
                ""
            }
        )
        .as_str(),
    )
    .into_response())
}

#[derive(Deserialize)]
pub struct PageParams {
    page: Option<usize>,
}

pub async fn route_scoreboard_division(
    State(state): State<RouterState>,
    Extension(user): Extension<MaybeUser>,
    Extension(page): Extension<PageMeta>,
    Path(division_id): Path<String>,
    Query(params): Query<PageParams>,
    uri: Uri,
    req: Request<Body>,
) -> std::result::Result<Response, Response> {
    let page_num = params.page.unwrap_or(1).saturating_sub(1);

    let division_id = division_id.strip_suffix(".json").unwrap_or(&division_id);

    let scoreboard = state.db.get_scoreboard(division_id);
    let challenge_data = state.db.get_challenges();
    let leaderboard = state.db.get_leaderboard(division_id);
    let (scoreboard, challenge_data, leaderboard) =
        tokio::try_join!(scoreboard, challenge_data, leaderboard)
            .map_err_page(&req, "Failed to get data")?;

    const PAGE_SIZE: usize = 25;
    let num_pages = (leaderboard.len() + (PAGE_SIZE - 1)) / PAGE_SIZE;
    let page_num = page_num.min(num_pages);

    let start = std::cmp::min(leaderboard.len(), page_num * PAGE_SIZE);
    let end = std::cmp::min(leaderboard.len(), start + PAGE_SIZE);
    let leaderboard = &leaderboard[start..end];

    if uri.path().ends_with(".json") {
        return Ok((
            [("Content-Type", "application/json")],
            scoreboard.cached_json.clone(),
        )
            .into_response());
    }

    Ok(Html(
        state
            .jinja
            .get_template("scoreboard.html")
            .unwrap()
            .render(context! {
                global => state.global_page_meta,
                page,
                user,
                uri => "/scoreboard",
                title => format!("Scoreboard | {}", state.global_page_meta.title),
                scoreboard => scoreboard.teams,
                divisions => challenge_data.divisions,
                leaderboard,
                selected_division_id => division_id,
                page_num,
                num_pages,
            })
            .unwrap(),
    )
    .into_response())
}

/// Implements the feed as described by <https://ctftime.org/json-scoreboard-feed>
pub async fn route_scoreboard_division_ctftime(
    State(state): State<RouterState>,
    Path(division_id): Path<String>,
) -> impl IntoResponse {
    let challenge_data = state.db.get_challenges();
    let leaderboard = state.db.get_leaderboard(&division_id);
    let Ok((challenge_data, leaderboard)) = tokio::try_join!(challenge_data, leaderboard) else {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "error": {
                    "kind": "caught",
                    "description": "Failed to get data"
                },
                "tasks": [],
                "standings": []
            })),
        )
            .into_response();
    };

    let tasks = challenge_data
        .challenges
        .values()
        .map(|challenge| &challenge.name)
        .collect::<Vec<_>>();

    let standings = leaderboard
        .iter()
        .map(|team| {
            json!({
                "pos": team.rank,
                "team": team.team_name,
                "score": team.score,
            })
        })
        .collect::<Vec<_>>();

    Json(json!({ "tasks": tasks, "standings": standings })).into_response()
}
