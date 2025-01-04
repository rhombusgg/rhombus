use axum::{
    extract::{Path, State},
    http::Extensions,
    response::{Html, IntoResponse, Response},
    Extension,
};
use minijinja::context;
use reqwest::StatusCode;

use crate::{
    errors::RhombusError,
    internal::{
        auth::MaybeUser,
        errors::{error_page, IntoErrorResponse},
        router::RouterState,
        routes::meta::PageMeta,
    },
};

pub async fn route_public_user(
    State(state): State<RouterState>,
    Extension(user): Extension<MaybeUser>,
    Extension(page): Extension<PageMeta>,
    Path(user_id): Path<i64>,
    extensions: Extensions,
) -> std::result::Result<impl IntoResponse, Response> {
    let public_user = match state.db.get_user_from_id(user_id).await {
        Err(RhombusError::DatabaseReturnedNoRows) => {
            return Err(error_page(
                StatusCode::NOT_FOUND,
                "User not found",
                &state,
                &user,
                &page,
            ));
        }
        result => result.map_err_page(&extensions, "Failed to get user data")?,
    };

    let challenge_data = state.db.get_challenges();
    let team = state.db.get_team_from_id(public_user.team_id);
    let (challenge_data, team) =
        tokio::try_join!(challenge_data, team).map_err_page(&extensions, "Failed to get data")?;

    Ok(Html(
        state
            .jinja
            .get_template("account/public-user.html")
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
            .map_err_page(&extensions, "Failed to render template")?,
    ))
}

pub async fn route_public_team(
    State(state): State<RouterState>,
    Extension(user): Extension<MaybeUser>,
    Extension(page): Extension<PageMeta>,
    Path(team_id): Path<i64>,
    extensions: Extensions,
) -> std::result::Result<impl IntoResponse, Response> {
    let team = match state.db.get_team_from_id(team_id).await {
        Err(RhombusError::DatabaseReturnedNoRows) => {
            return Err(error_page(
                StatusCode::NOT_FOUND,
                "Team not found",
                &state,
                &user,
                &page,
            ));
        }
        result => result.map_err_page(&extensions, "Failed to get team data")?,
    };

    let challenge_data = state.db.get_challenges();
    let standing = state.db.get_team_standing(team_id);
    let (challenge_data, standing) = tokio::try_join!(challenge_data, standing)
        .map_err_page(&extensions, "Failed to get data")?;

    Ok(Html(
        state
            .jinja
            .get_template("team/public-team.html")
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
            .map_err_page(&extensions, "Failed to render template")?,
    ))
}
