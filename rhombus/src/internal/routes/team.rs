use axum::{
    extract::{Path, State},
    http::Extensions,
    response::{Html, IntoResponse, Response},
    Extension, Form,
};
use minijinja::context;
use rand::{
    distributions::{Alphanumeric, DistString},
    thread_rng,
};
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use unicode_segmentation::UnicodeSegmentation;

use crate::internal::{
    auth::User,
    database::provider::SetTeamNameError,
    division::MaxDivisionPlayers,
    errors::{htmx_error_status_code, IntoErrorResponse},
    router::RouterState,
    routes::meta::PageMeta,
    templates::{toast_header, ToastKind},
};

pub fn create_team_invite_token() -> String {
    Alphanumeric.sample_string(&mut thread_rng(), 16)
}

#[derive(Debug, Serialize)]
pub struct TeamDivision<'a> {
    pub id: String,
    pub name: &'a str,
    pub description: &'a str,
    pub eligible: bool,
    pub requirement: Option<String>,
    pub joined: bool,
    pub max_players: MaxDivisionPlayers,
}

pub async fn route_team(
    State(state): State<RouterState>,
    Extension(user): Extension<User>,
    Extension(page): Extension<PageMeta>,
    extensions: Extensions,
) -> std::result::Result<impl IntoResponse, Response> {
    let challenge_data = state.db.get_challenges();
    let team = state.db.get_team_from_id(user.team_id);
    let (challenge_data, team) = tokio::try_join!(challenge_data, team)
        .map_err_page(&extensions, "Failed to get team data")?;

    let standing = state
        .db
        .get_team_standing(user.team_id)
        .await
        .map_err_page(&extensions, "Failed to get team standing")?;

    let location_url = state.settings.read().await.location_url.clone();

    let team_invite_url = format!("{}/signin?token={}", location_url, team.invite_token);

    let mut divisions = vec![];
    for division in state.divisions.iter() {
        let eligible = division
            .division_eligibility
            .is_user_eligible(team.owner_user_id)
            .await;

        let oversized = match division.max_players {
            MaxDivisionPlayers::Unlimited => true,
            MaxDivisionPlayers::Limited(max_players) => {
                team.users.len() <= max_players.get() as usize
            }
        };

        let joined = team.division_id == division.id;

        divisions.push(TeamDivision {
            id: division.id.clone(),
            name: &division.name,
            description: &division.description,
            eligible: eligible.is_ok() && oversized,
            requirement: eligible.err(),
            joined,
            max_players: division.max_players.clone(),
        })
    }

    let max_players = divisions
        .iter()
        .filter(|division| division.joined)
        .filter_map(|division| match division.max_players {
            MaxDivisionPlayers::Unlimited => None,
            MaxDivisionPlayers::Limited(max) => Some(max),
        })
        .min()
        .map(MaxDivisionPlayers::Limited)
        .unwrap_or(MaxDivisionPlayers::Unlimited);

    let now = chrono::Utc::now();

    Ok(Html(
        state
            .jinja
            .get_template("team/team.html")
            .unwrap()
            .render(context! {
                global => state.global_page_meta,
                page,
                title => format!("Team | {}", state.global_page_meta.title),
                og_image => format!("{}/team/{}/og-image.png", state.global_page_meta.location_url, team.id),
                user,
                team,
                team_invite_url,
                max_players,
                now,
                minutes_until_division_change => team.last_division_change.map(|t| ((t + chrono::Duration::minutes(60)) - now).num_minutes() + 1),
                challenges => challenge_data.challenges,
                categories => challenge_data.categories,
                divisions,
                standing,
                division_id => team.division_id,
            })
            .map_err_page(&extensions, "Failed to render template team/team.html")?,
    ))
}

pub async fn route_team_roll_token(
    State(state): State<RouterState>,
    Extension(user): Extension<User>,
    Extension(page): Extension<PageMeta>,
) -> Result<impl IntoResponse, StatusCode> {
    if !user.is_team_owner {
        return Err(StatusCode::UNAUTHORIZED);
    }

    let new_invite_token = match state.db.roll_invite_token(user.team_id).await {
        Ok(token) => token,
        Err(e) => {
            tracing::error!(error=?e, user_id=user.id, "Failed to roll invite token");
            return Err(htmx_error_status_code());
        }
    };

    let location_url = { state.settings.read().await.location_url.clone() };
    let team_invite_url = format!("{}/signin?token={}", location_url, new_invite_token);

    Ok(Html(
        state
            .jinja
            .get_template("team/team-token.html")
            .unwrap()
            .render(context! {
                page,
                team_invite_url => team_invite_url,
            })
            .map_err(|e| {
                tracing::error!(error=?e, user_id=user.id, "Failed to render template team/team-token.html");
                htmx_error_status_code()
            })?,
    ))
}

#[derive(Deserialize)]
pub struct SetTeamName {
    name: String,
}

pub async fn route_team_set_name(
    State(state): State<RouterState>,
    Extension(user): Extension<User>,
    Extension(page): Extension<PageMeta>,
    Form(form): Form<SetTeamName>,
) -> Result<impl IntoResponse, StatusCode> {
    if !user.is_team_owner {
        return Err(StatusCode::UNAUTHORIZED);
    }

    if user.disabled {
        return Err(StatusCode::FORBIDDEN);
    }

    let mut errors = vec![];
    let graphemes = form.name.graphemes(true).count();
    if !(3..=30).contains(&graphemes) || !(0..=256).contains(&form.name.len()) {
        errors.push(
            state
                .localizer
                .localize(&page.lang, "team-error-name-length", None),
        );
    } else if let Err(e) = state
        .db
        .set_team_name(user.team_id, &form.name, 60 * 30)
        .await
        .map_err(|e| {
            tracing::error!(error = ?e, team_id=user.team_id, name=form.name, "Failed to set team name");
            htmx_error_status_code()
        })?
    {
        match e {
            SetTeamNameError::Taken => {
                errors.push(
                    state
                        .localizer
                        .localize(&page.lang, "team-error-name-taken", None),
                );
            }
            SetTeamNameError::Timeout(resets_at) => {
                let resets_in = resets_at - chrono::Utc::now();
                errors.push(Some(format!(
                    "You can change name again in {} minutes",
                    resets_in.num_minutes() + 1
                )));
            }
        }
    }

    let team_name_template = state.jinja.get_template("team/team-set-name.html").unwrap();

    let ctx = if errors.is_empty() {
        context! {
            page,
            new_team_name => &form.name,
        }
    } else {
        context! {
            page,
            errors,
        }
    };

    let html = team_name_template.render(&ctx).unwrap();

    Ok(Html(html))
}

pub async fn route_user_kick(
    State(state): State<RouterState>,
    Extension(user): Extension<User>,
    Path(user_id): Path<i64>,
) -> std::result::Result<impl IntoResponse, StatusCode> {
    if user_id == user.id && !user.is_team_owner {
        let new_team_id = match state.db.kick_user(user.id, user.team_id).await {
            Ok(new_team_id) => new_team_id,
            Err(e) => {
                tracing::error!(error = ?e, who_user_id = user.id, team_id = user.team_id, to_kick_user_id=user_id, "Failed to kick user");
                return Err(htmx_error_status_code());
            }
        };

        if let (Some(bot), Some(user_discord_id)) = (state.bot.as_ref(), user.discord_id) {
            let old_team = match state.db.get_team_from_id(user.team_id).await {
                Ok(team) => team,
                Err(e) => {
                    tracing::error!(error = ?e, who_user_id = user.id, team_id = user.team_id, to_kick_user_id=user_id, "Failed to get old team");
                    return Err(htmx_error_status_code());
                }
            };

            let old_division = state
                .divisions
                .iter()
                .find(|d| d.id == old_team.division_id)
                .unwrap();

            let new_team = match state.db.get_team_from_id(new_team_id).await {
                Ok(team) => team,
                Err(e) => {
                    tracing::error!(error = ?e, who_user_id = user.id, team_id = user.team_id, to_kick_user_id=user_id, "Failed to get new team");
                    return Err(htmx_error_status_code());
                }
            };

            let new_division = state
                .divisions
                .iter()
                .find(|d| d.id == new_team.division_id)
                .unwrap();

            if old_division.discord_role_id != new_division.discord_role_id {
                if let Some(discord_role_id) = old_division.discord_role_id {
                    bot.remove_role_from_users(&[user_discord_id], discord_role_id)
                        .await;
                }

                if let Some(discord_role_id) = new_division.discord_role_id {
                    bot.give_role_to_users(&[user_discord_id], discord_role_id)
                        .await;
                }
            }

            if let Some(top10_role_id) = state
                .settings
                .read()
                .await
                .discord
                .as_ref()
                .and_then(|discord| discord.top10_role_id)
            {
                let old_team_standing = state.db.get_team_standing(old_team.id);
                let new_team_standing = state.db.get_team_standing(new_team.id);

                let (old_team_standing, new_team_standing) =
                    tokio::try_join!(old_team_standing, new_team_standing)
                        .map_err(|e| {
                            tracing::error!(error = ?e, who_user_id = user.id, team_id = user.team_id, to_kick_user_id=user_id, "Failed to get team standings");
                            htmx_error_status_code()
                        })?;

                let old_team_top_10 = old_team_standing
                    .map(|standing| standing.rank <= 10)
                    .unwrap_or(false);

                let new_team_top_10 = new_team_standing
                    .map(|standing| standing.rank <= 10)
                    .unwrap_or(false);

                if old_team_top_10 != new_team_top_10 {
                    if new_team_top_10 {
                        bot.give_role_to_users(&[user_discord_id], top10_role_id)
                            .await;
                    } else {
                        bot.remove_role_from_users(&[user_discord_id], top10_role_id)
                            .await;
                    }
                }
            }
        }

        return Ok(([("HX-Trigger", "pageRefresh")]).into_response());
    }

    if !user.is_team_owner {
        return Err(htmx_error_status_code());
    }

    let team = match state.db.get_team_from_id(user.team_id).await {
        Ok(team) => team,
        Err(e) => {
            tracing::error!(error = ?e, who_user_id = user.id, team_id = user.team_id, to_kick_user_id=user_id, "Failed to get team");
            return Err(htmx_error_status_code());
        }
    };
    let Some(user_in_team) = team.users.get(&user_id) else {
        return Err(htmx_error_status_code());
    };

    let new_team_id = match state.db.kick_user(user_id, user.team_id).await {
        Ok(new_team_id) => new_team_id,
        Err(e) => {
            tracing::error!(error = ?e, who_user_id = user.id, team_id = user.team_id, to_kick_user_id=user_id, "Failed to kick user");
            return Err(htmx_error_status_code());
        }
    };

    if let (Some(bot), Some(user_discord_id)) = (state.bot.as_ref(), user_in_team.discord_id) {
        let old_division = state
            .divisions
            .iter()
            .find(|d| d.id == team.division_id)
            .unwrap();

        let new_team = match state.db.get_team_from_id(new_team_id).await {
            Ok(team) => team,
            Err(e) => {
                tracing::error!(error = ?e, who_user_id = user.id, team_id = user.team_id, to_kick_user_id=user_id, "Failed to get new team");
                return Err(htmx_error_status_code());
            }
        };
        let new_division = state
            .divisions
            .iter()
            .find(|d| d.id == new_team.division_id)
            .unwrap();

        if old_division.discord_role_id != new_division.discord_role_id {
            if let Some(discord_role_id) = old_division.discord_role_id {
                bot.remove_role_from_users(&[user_discord_id], discord_role_id)
                    .await;
            }

            if let Some(discord_role_id) = new_division.discord_role_id {
                bot.give_role_to_users(&[user_discord_id], discord_role_id)
                    .await;
            }
        }

        if let Some(top10_role_id) = state
            .settings
            .read()
            .await
            .discord
            .as_ref()
            .and_then(|discord| discord.top10_role_id)
        {
            let old_team_standing = state.db.get_team_standing(team.id);
            let new_team_standing = state.db.get_team_standing(new_team.id);
            let (old_team_standing, new_team_standing) =
                tokio::try_join!(old_team_standing, new_team_standing)
                    .map_err(|e| {
                        tracing::error!(error = ?e, who_user_id = user.id, team_id = user.team_id, to_kick_user_id=user_id, "Failed to get team standings");
                        htmx_error_status_code()
                    })?;
            let old_team_top_10 = old_team_standing
                .map(|standing| standing.rank <= 10)
                .unwrap_or(false);
            let new_team_top_10 = new_team_standing
                .map(|standing| standing.rank <= 10)
                .unwrap_or(false);
            if old_team_top_10 != new_team_top_10 {
                if new_team_top_10 {
                    bot.give_role_to_users(&[user_discord_id], top10_role_id)
                        .await;
                } else {
                    bot.remove_role_from_users(&[user_discord_id], top10_role_id)
                        .await;
                }
            }
        }
    }

    Ok(([("HX-Trigger", "pageRefresh")]).into_response())
}

pub async fn route_team_set_division(
    State(state): State<RouterState>,
    Extension(user): Extension<User>,
    Extension(page): Extension<PageMeta>,
    Path(division_id): Path<String>,
) -> std::result::Result<impl IntoResponse, Response> {
    if !user.is_team_owner {
        return Err(StatusCode::UNAUTHORIZED.into_response());
    }

    if user.disabled {
        return Err(StatusCode::FORBIDDEN.into_response());
    }

    let team = state.db.get_team_from_id(user.team_id).await.unwrap();

    let next_allowed =
        team.last_division_change.unwrap_or_default() + chrono::Duration::minutes(60);

    let now = chrono::Utc::now();
    if next_allowed > now {
        let resets_in = next_allowed - now;

        return Err(([
            (
                "HX-Trigger",
                toast_header(
                    ToastKind::Error,
                    &format!(
                        "You can change this division status again in {} minutes",
                        resets_in.num_minutes() + 1
                    ),
                ),
            ),
            (
                "HX-Location",
                r##"{{"path":"/team","select":"#screen","target":"#screen","swap":"outerHTML"}}"##
                    .to_string(),
            ),
        ])
        .into_response());
    }

    let division = state.divisions.iter().find(|d| d.id == division_id);
    let Some(division) = division else {
        return Err(StatusCode::NOT_FOUND.into_response());
    };

    match division.max_players {
        MaxDivisionPlayers::Limited(max_players) => {
            if team.users.len() > max_players.get() as usize {
                return Err(StatusCode::FORBIDDEN.into_response());
            }
        }
        MaxDivisionPlayers::Unlimited => {}
    }

    let eligible = division
        .division_eligibility
        .is_user_eligible(user.id)
        .await
        .is_ok();

    if !eligible {
        return Err(StatusCode::FORBIDDEN.into_response());
    }

    state
        .db
        .set_team_division(team.id, &team.division_id, &division_id, now)
        .await
        .unwrap();

    if let Some(bot) = state.bot.as_ref() {
        let user_discord_ids = team
            .users
            .values()
            .filter_map(|u| u.discord_id)
            .collect::<Vec<_>>();

        let old_division = state
            .divisions
            .iter()
            .find(|d| d.id == team.division_id)
            .unwrap();
        if let Some(discord_role_id) = old_division.discord_role_id {
            bot.remove_role_from_users(&user_discord_ids, discord_role_id)
                .await;
        }

        let new_division = state
            .divisions
            .iter()
            .find(|d| d.id == division_id)
            .unwrap();
        if let Some(discord_role_id) = new_division.discord_role_id {
            bot.give_role_to_users(&user_discord_ids, discord_role_id)
                .await;
        }
    }

    tracing::trace!(team_id = team.id, division_id, "Set division");

    let standing = state.db.get_team_standing(user.team_id).await.unwrap();

    let mut divisions = vec![];
    for division in state.divisions.iter() {
        let eligible = division
            .division_eligibility
            .is_user_eligible(team.owner_user_id)
            .await;

        let oversized = match division.max_players {
            MaxDivisionPlayers::Unlimited => true,
            MaxDivisionPlayers::Limited(max_players) => {
                team.users.len() <= max_players.get() as usize
            }
        };

        let joined = division_id == division.id;

        divisions.push(TeamDivision {
            id: division.id.clone(),
            name: &division.name,
            description: &division.description,
            eligible: eligible.is_ok() && oversized,
            requirement: eligible.err(),
            joined,
            max_players: division.max_players.clone(),
        })
    }

    let max_players = divisions
        .iter()
        .filter(|division| division.joined)
        .filter_map(|division| match division.max_players {
            MaxDivisionPlayers::Unlimited => None,
            MaxDivisionPlayers::Limited(max) => Some(max),
        })
        .min()
        .map(MaxDivisionPlayers::Limited)
        .unwrap_or(MaxDivisionPlayers::Unlimited);

    let html = state
        .jinja
        .get_template("team/team-set-division-partial.html")
        .unwrap()
        .render(context! {
            page,
            team,
            max_players,
            user,
            divisions,
            division_id,
            standing,
            minutes_until_division_change => Some(60),
            oob => true,
        })
        .unwrap();

    Ok(Html(html))
}
