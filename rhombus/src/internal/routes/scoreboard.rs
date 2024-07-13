use axum::{
    body::Body,
    extract::{Path, Query, Request, State},
    response::{Html, IntoResponse, Redirect},
    Extension, Json,
};
use minijinja::context;
use serde::Deserialize;
use serde_json::json;

use crate::internal::{auth::MaybeUser, locales::Languages, router::RouterState};

pub async fn route_scoreboard(
    state: State<RouterState>,
    user: Extension<MaybeUser>,
    lang: Extension<Languages>,
    params: Query<PageParams>,
    req: Request<Body>,
) -> impl IntoResponse {
    let challenge_data = state.db.get_challenges().await.unwrap();
    let default_division = challenge_data.divisions.keys().next().unwrap();
    if challenge_data.divisions.len() == 1 {
        return route_scoreboard_division(state, user, lang, Path(*default_division), params, req)
            .await
            .into_response();
    }

    Redirect::temporary(format!("/scoreboard/{}", default_division).as_str()).into_response()
}

#[derive(Deserialize)]
pub struct PageParams {
    page: Option<u64>,
}

pub async fn route_scoreboard_division(
    state: State<RouterState>,
    Extension(user): Extension<MaybeUser>,
    Extension(lang): Extension<Languages>,
    Path(division_id): Path<i64>,
    params: Query<PageParams>,
    req: Request<Body>,
) -> impl IntoResponse {
    let page = params.page.unwrap_or(1).saturating_sub(1);

    let scoreboard = state.db.get_scoreboard(division_id);
    let challenge_data = state.db.get_challenges();
    let leaderboard = state.db.get_leaderboard(division_id, Some(page));
    let (scoreboard, challenge_data, leaderboard) =
        futures::future::try_join3(scoreboard, challenge_data, leaderboard)
            .await
            .unwrap();

    if let Some(accept) = req.headers().get("accept") {
        if accept.to_str().unwrap() == "application/json" {
            return Json(scoreboard.teams).into_response();
        }
    }

    let title = { state.settings.read().await.title.clone() };

    Html(
        state
            .jinja
            .get_template("scoreboard.html")
            .unwrap()
            .render(context! {
                lang,
                user,
                title,
                uri => "/scoreboard",
                scoreboard => scoreboard.teams,
                divisions => challenge_data.divisions,
                leaderboard,
                selected_division_id => division_id,
                page,
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
