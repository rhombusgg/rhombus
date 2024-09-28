use std::collections::BTreeMap;

use axum::{
    extract::{Path, State},
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
    auth::User, database::provider::SetTeamNameError, division::MaxDivisionPlayers,
    router::RouterState, routes::meta::PageMeta,
};

pub fn create_team_invite_token() -> String {
    Alphanumeric.sample_string(&mut thread_rng(), 16)
}

#[derive(Debug, Serialize)]
pub struct TeamDivision<'a> {
    pub id: i64,
    pub name: &'a str,
    pub description: &'a str,
    pub eligible: bool,
    pub ineligible_user_ids: Vec<i64>,
    pub joined: bool,
    pub max_players: MaxDivisionPlayers,
}

pub async fn route_team(
    state: State<RouterState>,
    Extension(user): Extension<User>,
    Extension(page): Extension<PageMeta>,
) -> impl IntoResponse {
    let challenge_data = state.db.get_challenges();
    let team = state.db.get_team_from_id(user.team_id);
    let team_divisions = state.db.get_team_divisions(user.team_id);
    let standings = state.db.get_team_standings(user.team_id);
    let (challenge_data, team, team_divisions, standings) =
        tokio::join!(challenge_data, team, team_divisions, standings);
    let challenge_data = challenge_data.unwrap();
    let team = team.unwrap();
    let team_divisions = team_divisions.unwrap();
    let standings = standings.unwrap();

    let location_url = state.settings.read().await.location_url.clone();

    let team_invite_url = format!("{}/signin?token={}", location_url, team.invite_token);

    let mut challenges = BTreeMap::new();
    for challenge in &challenge_data.challenges {
        challenges.insert(challenge.id, challenge);
    }

    let mut categories = BTreeMap::new();
    for category in &challenge_data.categories {
        categories.insert(category.id, category);
    }

    let mut divisions = vec![];
    for division in state.divisions.iter() {
        let mut ineligible_user_ids = vec![];
        for user_id in team.users.keys() {
            let user_divisions = state.db.get_user_divisions(*user_id).await.unwrap();

            if !user_divisions.contains(&division.id) {
                ineligible_user_ids.push(*user_id);
            }
        }

        let oversized = match division.max_players {
            MaxDivisionPlayers::Unlimited => true,
            MaxDivisionPlayers::Limited(max_players) => {
                team.users.len() <= max_players.get() as usize
            }
        };

        divisions.push(TeamDivision {
            id: division.id,
            name: &division.name,
            description: &division.description,
            eligible: ineligible_user_ids.is_empty() && oversized,
            ineligible_user_ids,
            joined: team_divisions.contains(&division.id),
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

    let num_joined_divisions = divisions.iter().filter(|d| d.joined).count();

    Html(
        state
            .jinja
            .get_template("team.html")
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
                now => chrono::Utc::now(),
                challenges,
                categories,
                num_joined_divisions,
                divisions,
                standings => standings.standings,
            })
            .unwrap(),
    )
}

pub async fn route_team_roll_token(
    state: State<RouterState>,
    Extension(user): Extension<User>,
    Extension(page): Extension<PageMeta>,
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
                page,
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
        .unwrap()
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

    let team_name_template = state.jinja.get_template("team-set-name.html").unwrap();

    if errors.is_empty() {
        let html = team_name_template
            .render(context! {
                page,
                new_team_name => &form.name,
            })
            .unwrap();

        Ok(Response::builder()
            .header("Content-Type", "text/html")
            .body(html)
            .unwrap())
    } else {
        let html = team_name_template
            .render(context! {
                page,
                errors,
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

#[derive(Deserialize)]
pub struct DivisionSet {
    join: Option<String>,
}

pub async fn route_team_set_division(
    state: State<RouterState>,
    Extension(user): Extension<User>,
    Extension(page): Extension<PageMeta>,
    Path(division_id): Path<i64>,
    Form(form): Form<DivisionSet>,
) -> impl IntoResponse {
    if !user.is_team_owner {
        return Response::builder()
            .status(StatusCode::UNAUTHORIZED)
            .body("".to_owned())
            .unwrap();
    }

    if user.disabled {
        return Response::builder()
            .status(StatusCode::FORBIDDEN)
            .body("".to_owned())
            .unwrap();
    }

    let team_division_last_edit_time = state
        .db
        .get_team_division_last_edit_time(user.team_id, division_id)
        .await
        .unwrap()
        .unwrap_or_default();

    let next_allowed = team_division_last_edit_time + chrono::Duration::minutes(120);
    if next_allowed > chrono::Utc::now() {
        let resets_in = next_allowed - chrono::Utc::now();

        return Response::builder()
            .header(
                "HX-Trigger",
                format!(r##"{{"toast":{{"kind":"error","message":"You can change this division status again in {} minutes"}}}}"##, resets_in.num_minutes() + 1)
            )
            .header(
                "HX-Location",
                r##"{"path":"/team","select":"#screen","target":"#screen","swap":"outerHTML"}"##,
            )
            .body("".to_owned())
            .unwrap();
    }

    state
        .db
        .set_team_division_last_edit_time(user.team_id, division_id)
        .await
        .unwrap();

    let team = state.db.get_team_from_id(user.team_id).await.unwrap();
    let division = state.divisions.iter().find(|d| d.id == division_id);
    if let Some(division) = division {
        match division.max_players {
            MaxDivisionPlayers::Limited(max_players) => {
                if team.users.len() > max_players.get() as usize {
                    return Response::builder()
                        .status(StatusCode::FORBIDDEN)
                        .body("".to_owned())
                        .unwrap();
                }
            }
            MaxDivisionPlayers::Unlimited => {}
        }
    } else {
        return Response::builder()
            .status(StatusCode::NOT_FOUND)
            .body("".to_owned())
            .unwrap();
    }

    let team_divisions = state.db.get_team_divisions(team.id).await.unwrap();

    if team_divisions.len() == 1 && team_divisions.contains(&division_id) {
        tracing::info!("Cannot remove last division");
        return Response::builder()
            .status(StatusCode::FORBIDDEN)
            .body("".to_owned())
            .unwrap();
    }

    let mut eligible = true;
    for user_id in team.users.keys() {
        let user_divisions = state.db.get_user_divisions(*user_id).await.unwrap();

        if !user_divisions.contains(&division_id) {
            eligible = false;
            break;
        }
    }

    state
        .db
        .set_team_division(user.team_id, division_id, eligible && form.join.is_some())
        .await
        .unwrap();

    let standings = state.db.get_team_standings(user.team_id).await.unwrap();

    tracing::trace!(
        user_id = user.id,
        division_id,
        joined = form.join.is_some(),
        "Set division"
    );

    let team_divisions = state.db.get_team_divisions(team.id).await.unwrap();
    let max_players = state
        .divisions
        .iter()
        .filter(|division| team_divisions.contains(&division.id))
        .filter_map(|division| match division.max_players {
            MaxDivisionPlayers::Unlimited => None,
            MaxDivisionPlayers::Limited(max) => Some(max),
        })
        .min()
        .map(MaxDivisionPlayers::Limited)
        .unwrap_or(MaxDivisionPlayers::Unlimited);

    let team = state.db.get_team_from_id(user.team_id).await.unwrap();
    let mut divisions = vec![];
    for division in state.divisions.iter() {
        let mut ineligible_user_ids = vec![];
        for user_id in team.users.keys() {
            let user_divisions = state.db.get_user_divisions(*user_id).await.unwrap();

            if !user_divisions.contains(&division.id) {
                ineligible_user_ids.push(*user_id);
            }
        }

        let oversized = match division.max_players {
            MaxDivisionPlayers::Unlimited => true,
            MaxDivisionPlayers::Limited(max_players) => {
                team.users.len() <= max_players.get() as usize
            }
        };

        divisions.push(TeamDivision {
            id: division.id,
            name: &division.name,
            description: &division.description,
            eligible: ineligible_user_ids.is_empty() && oversized,
            ineligible_user_ids,
            joined: team_divisions.contains(&division.id),
            max_players: division.max_players.clone(),
        })
    }

    let num_joined_divisions = divisions.iter().filter(|d| d.joined).count();

    let html = state
        .jinja
        .get_template("team-set-division-partial.html")
        .unwrap()
        .render(context! {
            page,
            team,
            max_players,
            user,
            divisions,
            standings => standings.standings,
            num_joined_divisions,
            oob => true,
        })
        .unwrap();

    Response::builder().body(html).unwrap()
}
