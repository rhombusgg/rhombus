use axum::{
    extract::{path::FailedToDeserializePathParams, rejection::PathRejection, Path, Query, State},
    http::Uri,
    response::{Html, IntoResponse, Redirect},
    Extension, Json,
};
use minijinja::context;
use serde::Deserialize;
use serde_json::json;

use crate::internal::{auth::MaybeUser, router::RouterState, routes::meta::PageMeta};

pub async fn route_scoreboard(
    state: State<RouterState>,
    user: Extension<MaybeUser>,
    page: Extension<PageMeta>,
    params: Query<PageParams>,
    uri: Uri,
) -> impl IntoResponse {
    let challenge_data = state.db.get_challenges().await.unwrap();
    let default_division = challenge_data.divisions.keys().next().unwrap();
    if challenge_data.divisions.len() == 1 {
        return route_scoreboard_division(
            state,
            user,
            page,
            Path(default_division.to_string()),
            params,
            uri,
        )
        .await
        .into_response();
    }

    Redirect::temporary(
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
    .into_response()
}

#[derive(Deserialize)]
pub struct PageParams {
    page: Option<u64>,
}

pub async fn route_scoreboard_division(
    state: State<RouterState>,
    Extension(user): Extension<MaybeUser>,
    Extension(page): Extension<PageMeta>,
    Path(division_id): Path<String>,
    params: Query<PageParams>,
    uri: Uri,
) -> impl IntoResponse {
    let page_num = params.page.unwrap_or(1).saturating_sub(1);

    let Ok(division_id) = division_id
        .strip_suffix(".json")
        .unwrap_or(&division_id)
        .parse()
    else {
        return Err::<(), &str>("Failed to parse division ID as integer").into_response();
    };

    let scoreboard = state.db.get_scoreboard(division_id);
    let challenge_data = state.db.get_challenges();
    let leaderboard = state.db.get_leaderboard(division_id, Some(page_num));
    let (scoreboard, challenge_data, leaderboard) =
        futures::future::try_join3(scoreboard, challenge_data, leaderboard)
            .await
            .unwrap();

    if uri.path().ends_with(".json") {
        return Json(scoreboard.teams).into_response();
    }

    Html(
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
            })
            .unwrap(),
    )
    .into_response()
}

/// Implements the feed as described by https://ctftime.org/json-scoreboard-feed
pub async fn route_scoreboard_division_ctftime(
    state: State<RouterState>,
    Path(division_id): Path<i64>,
) -> impl IntoResponse {
    let challenge_data = state.db.get_challenges().await.unwrap();
    let leaderboard = state.db.get_leaderboard(division_id, None).await.unwrap();

    let tasks = challenge_data
        .challenges
        .iter()
        .map(|challenge| &challenge.name)
        .collect::<Vec<_>>();

    let standings = leaderboard
        .entries
        .iter()
        .map(|team| {
            json!({
                "pos": team.rank,
                "team": team.team_name,
                "score": team.score,
            })
        })
        .collect::<Vec<_>>();

    Json(json!({ "tasks": tasks, "standings": standings }))
}
