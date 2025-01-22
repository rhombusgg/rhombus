use std::{fmt::Write, net::IpAddr, num::NonZeroU64, sync::Arc};

use axum::{
    body::Body,
    extract::{Query, State},
    http::{
        header::{self, AUTHORIZATION},
        Extensions, Request, Response, StatusCode,
    },
    middleware::Next,
    response::{Html, IntoResponse, Redirect},
    Extension, Form, Json,
};
use axum_extra::extract::{
    cookie::{Cookie, SameSite},
    CookieJar,
};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use minijinja::context;
use rand::{
    distributions::{Alphanumeric, DistString as _},
    thread_rng,
};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;
use unicode_segmentation::UnicodeSegmentation;

use crate::{
    error_page_code,
    errors::RhombusError,
    internal::{
        division::MaxDivisionPlayers,
        errors::{error_page, IntoErrorResponse},
        locales::Languages,
        router::RouterState,
        routes::{meta::PageMeta, team::create_team_invite_token},
        templates::{toast_header, ToastKind},
    },
};

use super::database::provider::Database;

pub fn create_user_api_key(location_url: &str) -> String {
    format!(
        "{}_{}",
        base32::encode(
            base32::Alphabet::Rfc4648Lower { padding: false },
            location_url.as_bytes()
        ),
        Alphanumeric.sample_string(&mut thread_rng(), 32)
    )
}

#[derive(Debug, Serialize, Clone)]
pub struct UserInner {
    pub id: i64,
    pub name: String,
    pub avatar: String,
    pub discord_id: Option<NonZeroU64>,
    pub team_id: i64,
    pub is_team_owner: bool,
    pub disabled: bool,
    pub is_admin: bool,
    pub api_key: String,
}
pub type User = Arc<UserInner>;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TokenClaims {
    pub sub: i64,
    pub iat: i64,
    pub exp: i64,
}

pub type MaybeTokenClaims = Option<TokenClaims>;
pub type MaybeUser = Option<User>;

#[derive(Debug, Serialize, Clone)]
pub struct ErrorResponse {
    pub message: String,
}

pub async fn enforce_admin_middleware(
    Extension(user): Extension<User>,
    req: Request<Body>,
    next: Next,
) -> Result<impl IntoResponse, impl IntoResponse> {
    if !user.is_admin {
        return Err(Redirect::to("/account").into_response());
    }

    Ok(next.run(req).await)
}

pub async fn enforce_auth_middleware(
    Extension(maybe_user): Extension<MaybeUser>,
    Extension(maybe_token_claims): Extension<MaybeTokenClaims>,
    req: Request<Body>,
    next: Next,
) -> Result<impl IntoResponse, impl IntoResponse> {
    if maybe_user.is_none() || maybe_token_claims.is_none() {
        return Err(Redirect::to("/signin").into_response());
    }

    Ok(next.run(req).await)
}

pub async fn auth_injector_middleware(
    cookie_jar: CookieJar,
    state: State<RouterState>,
    mut req: Request<Body>,
    next: Next,
) -> impl IntoResponse {
    let maybe_token_claims: MaybeTokenClaims = None;
    req.extensions_mut().insert(maybe_token_claims);

    let maybe_user: MaybeUser = None;
    req.extensions_mut().insert(maybe_user);

    let token = cookie_jar
        .get("rhombus-token")
        .map(|cookie| cookie.value().to_string())
        .or_else(|| {
            req.headers()
                .get(&AUTHORIZATION)
                .and_then(|auth_header| auth_header.to_str().ok())
                .and_then(|auth_value| {
                    auth_value
                        .strip_prefix("Bearer ")
                        .map(|bearer| bearer.to_owned())
                })
        });

    if let Some(token) = token {
        if let Ok(token_data) = decode::<TokenClaims>(
            &token,
            &DecodingKey::from_secret(state.settings.read().await.jwt_secret.as_ref()),
            &Validation::default(),
        ) {
            let sub = token_data.claims.sub;
            req.extensions_mut().insert(Some(token_data.claims.clone()));
            req.extensions_mut().insert(token_data.claims);
            if let Ok(user) = state.db.get_user_from_id(sub).await {
                req.extensions_mut().insert(Some(user.clone()));
                req.extensions_mut().insert(user);
            }
        }
    }

    next.run(req).await
}

#[derive(Deserialize)]
pub struct SignInParams {
    token: Option<String>,
}

pub async fn route_signin(
    State(state): State<RouterState>,
    Extension(user): Extension<MaybeUser>,
    Extension(page): Extension<PageMeta>,
    Query(params): Query<SignInParams>,
    extensions: Extensions,
) -> std::result::Result<impl IntoResponse, Response<Body>> {
    let mut invite_token_cookie = Cookie::build(("rhombus-invite-token", ""))
        .path("/")
        .removal()
        .same_site(SameSite::Lax)
        .http_only(true);

    let mut team_name = None;

    if let Some(url_invite_token) = &params.token {
        if let Some(team_meta) = state
            .db
            .get_team_meta_from_invite_token(url_invite_token)
            .await
            .unwrap_or(None)
        {
            let new_team = state
                .db
                .get_team_from_id(team_meta.id)
                .await
                .map_err_page(&extensions, "Failed to get new team id")?;

            // You cannot join a team in which the owner has left (and is on a different team themselves). This doesn't
            // need an error page, it should just count as an invalid invite token and not register.
            if !new_team.users.is_empty() {
                if let Some(user) = &user {
                    // you cannot join a team if your current team has more than just you on it
                    let old_team = state
                        .db
                        .get_team_from_id(user.team_id)
                        .await
                        .map_err_page(&extensions, "Failed to get current team id")?;
                    if old_team.users.len() > 1 {
                        let html = state
                            .jinja
                            .get_template("team/join-error-existing-team.html")
                            .unwrap()
                            .render(context! {
                                global => state.global_page_meta,
                                page,
                                title => format!("Team Join Error | {}", state.global_page_meta.title),
                                user,
                                team => old_team,
                            })
                            .unwrap();
                        return Err(Html(html).into_response());
                    }

                    // you cannot join a team if the new team if, as a result of you joining it would
                    // lead to the team having more players than the minimum required by any division
                    let max_players = &state
                        .divisions
                        .iter()
                        .find(|division| division.id == new_team.division_id)
                        .unwrap()
                        .max_players;

                    match max_players {
                        MaxDivisionPlayers::Unlimited => {}
                        MaxDivisionPlayers::Limited(max_players) => {
                            if new_team.users.len() >= max_players.get() as usize {
                                let html = state
                                    .jinja
                                    .get_template("team/join-error-max.html")
                                    .unwrap()
                                    .render(context! {
                                        global => state.global_page_meta,
                                        page,
                                        title => format!("Team Join Error | {}", state.global_page_meta.title),
                                        user,
                                        team => new_team,
                                        max_players,
                                    })
                                    .unwrap();
                                return Err(Html(html).into_response());
                            }
                        }
                    }

                    state
                        .db
                        .add_user_to_team(user.id, team_meta.id, Some(old_team.id))
                        .await
                        .map_err_page(&extensions, "Failed to add user to team")?;

                    if let (Some(bot), Some(user_discord_id)) =
                        (state.bot.as_ref(), user.discord_id)
                    {
                        let old_division = state
                            .divisions
                            .iter()
                            .find(|d| d.id == old_team.division_id)
                            .unwrap();

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
                                    .map_err_page(&extensions, "Failed to get team standings")?;

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

                    return Ok(Redirect::to("/team").into_response());
                }

                invite_token_cookie = Cookie::build(("rhombus-invite-token", url_invite_token))
                    .path("/")
                    .same_site(SameSite::Lax)
                    .http_only(true);
                team_name = Some(team_meta.name.clone());
            }
        }
    };

    let auth_options = state.settings.read().await.auth.clone();

    let html = state
        .jinja
        .get_template("signin.html")
        .unwrap()
        .render(context! {
            global => state.global_page_meta,
            page,
            title => format!("Sign In | {}", state.global_page_meta.title),
            user,
            auth_options,
            team_name,
        })
        .unwrap();

    Ok((
        [("Set-Cookie", invite_token_cookie.to_string())],
        Html(html),
    )
        .into_response())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiscordOAuthStateClaims {
    state: String,
    iat: i64,
    exp: i64,
}

pub async fn route_signin_discord(State(state): State<RouterState>) -> impl IntoResponse {
    let (jwt_secret, location_url, client_id, autojoin) = {
        let settings = state.settings.read().await;

        if let Some(ref discord) = settings.discord {
            (
                settings.jwt_secret.clone(),
                settings.location_url.clone(),
                discord.client_id,
                discord.autojoin,
            )
        } else {
            return Redirect::temporary("/signin").into_response();
        }
    };

    let oauth_state = create_team_invite_token();

    let now = chrono::Utc::now();
    let iat = now.timestamp();
    let exp = (now + chrono::Duration::try_hours(1).unwrap()).timestamp();

    let signed_oauth_state = encode(
        &Header::default(),
        &DiscordOAuthStateClaims {
            state: oauth_state,
            iat,
            exp,
        },
        &EncodingKey::from_secret(jwt_secret.as_ref()),
    )
    .unwrap();

    let signin_url = format!(
        "https://discord.com/api/oauth2/authorize?client_id={}&redirect_uri={}/signin/discord/callback&response_type=code&scope=identify+email{}&state={}",
        client_id,
        location_url,
        if autojoin.unwrap_or(true) { "+guilds.join" } else { "" },
        signed_oauth_state,
    );

    let cookie = Cookie::build(("rhombus-oauth-discord", signed_oauth_state))
        .path("/")
        .same_site(SameSite::Lax)
        .http_only(true)
        .build();

    let mut response = Redirect::temporary(&signin_url).into_response();
    let headers = response.headers_mut();
    headers.insert(header::SET_COOKIE, cookie.to_string().parse().unwrap());
    response
}

#[derive(Debug, Deserialize)]
pub struct DiscordCallback {
    code: Option<String>,
    state: Option<String>,
    error: Option<String>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct DiscordOAuthToken {
    access_token: String,
    token_type: String,
    expires_in: i64,
    refresh_token: String,
    scope: String,
}

#[derive(Deserialize, Debug)]
#[allow(dead_code)]
struct DiscordProfile {
    id: String,
    email: Option<String>,
    username: String,
    avatar: Option<String>,
    global_name: String,
    discriminator: Option<String>,
}

pub async fn route_signin_discord_callback(
    State(state): State<RouterState>,
    Extension(user): Extension<MaybeUser>,
    Extension(page): Extension<PageMeta>,
    Query(params): Query<DiscordCallback>,
    extensions: Extensions,
    cookie_jar: CookieJar,
) -> std::result::Result<impl IntoResponse, Response<Body>> {
    let discord_oauth_cookie = cookie_jar
        .get("rhombus-oauth-discord")
        .map(|cookie| cookie.value())
        .map_err_page_code(&extensions, StatusCode::BAD_REQUEST, "State not set")?;

    if let Some(error) = &params.error {
        return Err(error_page_code!(
            &extensions,
            StatusCode::BAD_REQUEST,
            "Discord returned an error in a callback",
            error,
        ));
    }

    let code = params.code.map_err_page_code(
        &extensions,
        StatusCode::BAD_REQUEST,
        "Discord did not return a code",
    )?;

    let discord_oauth_state = params.state.map_err_page_code(
        &extensions,
        StatusCode::BAD_REQUEST,
        "Discord did not return a state",
    )?;

    if discord_oauth_cookie != discord_oauth_state {
        return Err(error_page_code!(
            &extensions,
            StatusCode::BAD_REQUEST,
            "OAuth state mismatch",
        ));
    }

    struct DiscordOAuthSettings {
        client_id: NonZeroU64,
        client_secret: String,
        guild_id: NonZeroU64,
        bot_token: String,
    }

    let (discord, location_url, jwt_secret) = {
        let settings = state.settings.read().await;
        (
            settings.discord.as_ref().map(|d| DiscordOAuthSettings {
                client_id: d.client_id,
                client_secret: d.client_secret.clone(),
                guild_id: d.guild_id,
                bot_token: d.bot_token.clone(),
            }),
            settings.location_url.clone(),
            settings.jwt_secret.clone(),
        )
    };

    decode::<DiscordOAuthStateClaims>(
        discord_oauth_cookie,
        &DecodingKey::from_secret(jwt_secret.as_ref()),
        &Validation::default(),
    )
    .map_err_page_code(&extensions, StatusCode::BAD_REQUEST, "Claims are invalid")?;

    let discord = discord.map_err_page(&extensions, "Discord is not configured")?;

    let client = Client::new();
    let res = client
        .post("https://discord.com/api/oauth2/token")
        .header(
            reqwest::header::CONTENT_TYPE,
            "application/x-www-form-urlencoded",
        )
        .basic_auth(discord.client_id, Some(&discord.client_secret))
        .form(&[
            ("grant_type", "authorization_code"),
            ("code", code.as_str()),
            (
                "redirect_uri",
                format!("{}/signin/discord/callback", location_url).as_str(),
            ),
        ])
        .send()
        .await
        .map_err_page(&extensions, "Failed to get discord oauth token")?;

    if !res.status().is_success() {
        let res = format!("{:?}", res.text().await);
        return Err(error_page_code!(
            &extensions,
            StatusCode::INTERNAL_SERVER_ERROR,
            "Discord returned an error getting oauth token",
            res,
        ));
    }

    let oauth_token = res
        .json::<DiscordOAuthToken>()
        .await
        .map_err_page(&extensions, "Failed to parse discord oauth token")?;

    let res = client
        .get("https://discord.com/api/users/@me")
        .bearer_auth(&oauth_token.access_token)
        .send()
        .await
        .map_err_page(&extensions, "Failed to get discord profile")?;

    if !res.status().is_success() {
        let res = format!("{:?}", res.text().await);
        return Err(error_page_code!(
            &extensions,
            StatusCode::INTERNAL_SERVER_ERROR,
            "Discord returned an error getting discord profile",
            res,
        ));
    }

    let profile = res
        .json::<DiscordProfile>()
        .await
        .map_err_page(&extensions, "Failed to parse discord profile")?;

    let discord_id = profile.id.parse::<NonZeroU64>().unwrap();

    let avatar = if let Some(avatar) = profile.avatar {
        format!(
            "https://cdn.discordapp.com/avatars/{}/{}.{}",
            profile.id,
            avatar,
            if avatar.starts_with("a_") {
                "gif"
            } else {
                "png"
            }
        )
    } else {
        let default_avatar_number = profile.discriminator.unwrap().parse::<i64>().unwrap() % 5;
        format!(
            "https://cdn.discordapp.com/embed/avatars/{}.png",
            default_avatar_number
        )
    };

    let location_url = state.settings.read().await.location_url.clone();
    let upsert_result = state
        .db
        .upsert_user_by_discord_id(
            &profile.global_name,
            profile.email.as_deref(),
            &avatar,
            discord_id,
            user.as_ref().map(|u| u.id),
            &location_url,
        )
        .await
        .map_err_page(&extensions, "Failed to upsert user by discord id")?;

    let (user_id, team_id) = match upsert_result {
        Ok(r) => r,
        Err(e) => match e {
            crate::internal::database::provider::DiscordUpsertError::AlreadyInUse => {
                let html = state
                    .jinja
                    .get_template("account/discord-taken-error.html")
                    .unwrap()
                    .render(context! {
                        global => state.global_page_meta,
                        page,
                        title => format!("Discord Sign In Error | {}", state.global_page_meta.title),
                        user,
                    })
                    .unwrap();
                return Err(Html(html).into_response());
            }
        },
    };

    if let Some(bot) = state.bot.as_ref() {
        bot.verify_user(discord_id)
            .await
            .map_err_page(&extensions, "Discord returned an error verifying user")?;

        let team = state
            .db
            .get_team_from_id(team_id)
            .await
            .map_err_page(&extensions, "Failed to get team from id")?;

        let division = state
            .divisions
            .iter()
            .find(|d| d.id == team.division_id)
            .unwrap();
        if let Some(discord_role_id) = division.discord_role_id {
            bot.give_role_to_users(&[discord_id], discord_role_id).await;
        }
    }

    // join the user to the guild
    let client = Client::new();
    let res = client
        .put(format!(
            "https://discord.com/api/guilds/{}/members/{}",
            discord.guild_id, profile.id
        ))
        .header("Authorization", format!("Bot {}", discord.bot_token))
        .json(&json!({
            "access_token": oauth_token.access_token,
        }))
        .send()
        .await
        .map_err_page(&extensions, "Failed to join user to guild")?;

    if !res.status().is_success() {
        let res = format!("{:?}", res.text().await);
        return Err(error_page_code!(
            &extensions,
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to join user to guild",
            res,
        ));
    }

    let unset_oauth_state_cookie = Cookie::build(("rhombus-oauth-discord", ""))
        .path("/")
        .removal()
        .same_site(SameSite::Lax)
        .http_only(true);

    let cookie = sign_in_cookie(&state, user_id, &cookie_jar)
        .await
        .map_err_page(&extensions, "Failed to add user to team")?;
    let mut response = Redirect::temporary("/team").into_response();
    let headers = response.headers_mut();
    headers.insert(header::SET_COOKIE, cookie.to_string().parse().unwrap());
    headers.append(
        header::SET_COOKIE,
        unset_oauth_state_cookie.to_string().parse().unwrap(),
    );
    Ok(response)
}

#[derive(Deserialize)]
#[allow(dead_code)]
pub struct CTFtimeCallback {
    code: String,
    state: String,
}

#[derive(Deserialize)]
#[allow(dead_code)]
struct CTFtimeOAuthToken {
    access_token: String,
    expires_in: i64,
    token_type: String,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct CTFtimeUserData {
    country: String,
    email: String,
    id: i64,
    name: String,
    team: CTFtimeTeamData,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct CTFtimeTeamData {
    id: i64,
    name: String,
    country: String,
    logo: String,
}

pub async fn route_signin_ctftime_callback(
    State(state): State<RouterState>,
    Extension(user): Extension<MaybeUser>,
    Query(params): Query<CTFtimeCallback>,
    cookie_jar: CookieJar,
    extensions: Extensions,
) -> std::result::Result<impl IntoResponse, Response<Body>> {
    if user.is_some() {
        return Err(error_page_code!(
            &extensions,
            StatusCode::BAD_REQUEST,
            "You are already signed in, so CTFtime cannot be linked. Please sign out, and sign back in with CTFtime as a new account.",
        ));
    }

    let ctftime_oauth_cookie = cookie_jar
        .get("rhombus-oauth-ctftime")
        .map(|cookie| cookie.value())
        .map_err_page_code(&extensions, StatusCode::BAD_REQUEST, "State not set")?;

    if ctftime_oauth_cookie != params.state {
        return Err(error_page_code!(
            &extensions,
            StatusCode::BAD_REQUEST,
            "State mismatch",
        ));
    }

    let (ctftime_settings, jwt_secret) = {
        let settings = state.settings.read().await;
        (settings.ctftime.clone(), settings.jwt_secret.clone())
    };

    decode::<DiscordOAuthStateClaims>(
        ctftime_oauth_cookie
            .replace("______________________________________", ".")
            .as_str(),
        &DecodingKey::from_secret(jwt_secret.as_ref()),
        &Validation::default(),
    )
    .map_err_page_code(&extensions, StatusCode::BAD_REQUEST, "Invalid state")?;

    let Some(ctftime_settings) = ctftime_settings else {
        return Err(error_page_code!(
            &extensions,
            StatusCode::INTERNAL_SERVER_ERROR,
            "CTFtime is not configured",
        ));
    };

    let Some(ctftime_client_secret) = ctftime_settings.client_secret else {
        return Err(error_page_code!(
            &extensions,
            StatusCode::INTERNAL_SERVER_ERROR,
            "CTFtime client secret is not configured",
        ));
    };

    let client = Client::new();
    let res = client
        .post("https://oauth.ctftime.org/token")
        .header(
            reqwest::header::CONTENT_TYPE,
            "application/x-www-form-urlencoded",
        )
        .basic_auth(ctftime_settings.client_id, Some(&ctftime_client_secret))
        .form(&[
            ("code", params.code.as_str()),
            ("client_id", ctftime_settings.client_id.to_string().as_str()),
            ("client_secret", ctftime_client_secret.as_str()),
            ("grant_type", "authorization_code"),
        ])
        .send()
        .await
        .map_err_page(&extensions, "Failed to get CTFtime oauth token")?;

    if res.status() != StatusCode::OK {
        let res = format!("{:?}", res.text().await);
        return Err(error_page_code!(
            &extensions,
            StatusCode::INTERNAL_SERVER_ERROR,
            "Invalid CTFtime oauth token",
            res,
        ));
    }

    let oauth_token = res
        .json::<CTFtimeOAuthToken>()
        .await
        .map_err_page(&extensions, "Failed to parse CTFtime oauth token")?;

    let res = client
        .get("https://oauth.ctftime.org/user")
        .bearer_auth(&oauth_token.access_token)
        .send()
        .await
        .map_err_page(&extensions, "Failed to get CTFtime user data")?;

    if !res.status().is_success() {
        let res = format!("{:?}", res.text().await);
        return Err(error_page_code!(
            &extensions,
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to get CTFtime user data",
            res,
        ));
    }

    let user_data = res
        .json::<CTFtimeUserData>()
        .await
        .map_err_page(&extensions, "Failed to parse CTFtime user data")?;

    let location_url = state.settings.read().await.location_url.clone();
    let (user_id, _team_id, invite_token) = state
        .db
        .upsert_user_by_ctftime(
            &user_data.name,
            &user_data.email,
            &if user_data.team.logo.is_empty() {
                avatar_from_email(&user_data.name)
            } else {
                user_data.team.logo
            },
            user_data.id,
            user_data.team.id,
            &user_data.team.name,
            &location_url,
        )
        .await
        .map_err_page(&extensions, "Failed to upsert user by ctftime")?;

    let cookie = sign_in_cookie(&state, user_id, &cookie_jar)
        .await
        .map_err_page(&extensions, "Failed to add user to team")?;
    let mut response = if let Some(invite_token) = invite_token {
        Redirect::temporary(format!("/signin?token={}", invite_token).as_str()).into_response()
    } else {
        Redirect::temporary("/team").into_response()
    };
    let headers = response.headers_mut();
    headers.insert(header::SET_COOKIE, cookie.to_string().parse().unwrap());
    Ok(response)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CTFtimeOAuthStateClaims {
    state: String,
    iat: i64,
    exp: i64,
}

pub async fn route_signin_ctftime(
    State(state): State<RouterState>,
    extensions: Extensions,
) -> std::result::Result<impl IntoResponse, Response<Body>> {
    let (jwt_secret, location_url, client_id) = {
        let settings = state.settings.read().await;

        if let Some(ref ctftime) = settings.ctftime {
            (
                settings.jwt_secret.clone(),
                settings.location_url.clone(),
                ctftime.client_id,
            )
        } else {
            return Err(error_page_code!(
                &extensions,
                StatusCode::INTERNAL_SERVER_ERROR,
                "CTFtime is not configured",
            ));
        }
    };

    let oauth_state = create_team_invite_token();

    let now = chrono::Utc::now();
    let iat = now.timestamp();
    let exp = (now + chrono::Duration::try_hours(1).unwrap()).timestamp();

    let signed_oauth_state = encode(
        &Header::default(),
        &CTFtimeOAuthStateClaims {
            state: oauth_state,
            iat,
            exp,
        },
        &EncodingKey::from_secret(jwt_secret.as_ref()),
    )
    .unwrap();

    // ctftime doesn't like dots in the state (or any non-base64url-encoded characters)
    // so we replace them with a statistically unlikely sequence of underscores. This is
    // then re-replaced in [[route_signin_ctftime_callback]]
    let signed_oauth_state =
        signed_oauth_state.replace('.', "______________________________________");

    let signin_url = format!(
        "https://oauth.ctftime.org/authorize?response_type=code&client_id={}&redirect_uri={}/signin/ctftime/callback&scope=profile%20team&state={}",
        client_id,
        location_url,
        signed_oauth_state,
    );

    let cookie = Cookie::build(("rhombus-oauth-ctftime", signed_oauth_state))
        .path("/")
        .same_site(SameSite::Lax)
        .http_only(true)
        .build();

    let mut response = Redirect::temporary(&signin_url).into_response();
    let headers = response.headers_mut();
    headers.insert(header::SET_COOKIE, cookie.to_string().parse().unwrap());
    Ok(response)
}

#[derive(Deserialize)]
pub struct EmailSubmit {
    email: String,
}

pub async fn route_signin_email(
    State(state): State<RouterState>,
    Extension(user): Extension<MaybeUser>,
    Extension(lang): Extension<Languages>,
    Extension(ip): Extension<Option<IpAddr>>,
    Form(form): Form<EmailSubmit>,
) -> impl IntoResponse {
    if form.email.is_empty() || form.email.len() > 255 {
        return ([(
            "HX-Trigger",
            toast_header(
                ToastKind::Error,
                &state
                    .localizer
                    .localize(&lang, "account-error-email-length", None)
                    .unwrap(),
            ),
        )],)
            .into_response();
    }

    let outbound_mailer = state.outbound_mailer.as_ref().unwrap();

    let code = match state
        .db
        .create_email_signin_callback_code(&form.email)
        .await
    {
        Ok(code) => code,
        Err(e) => {
            let user_id = user.as_ref().map(|u| u.id);
            tracing::error!(error = ?e, user_id, "Failed to create email signin callback code");
            return ([(
                "HX-Trigger",
                toast_header(
                    ToastKind::Error,
                    &state
                        .localizer
                        .localize(&lang, "account-error-signin-email", None)
                        .unwrap(),
                ),
            )],)
                .into_response();
        }
    };

    if let Err(e) = outbound_mailer
        .send_email_signin(ip.map(|ip| ip.to_string()).as_deref(), &form.email, &code)
        .await
    {
        let user_id = user.as_ref().map(|u| u.id);
        tracing::error!(error = ?e, user_id, "Failed to create email signin callback code");
        return ([(
            "HX-Trigger",
            toast_header(
                ToastKind::Error,
                &state
                    .localizer
                    .localize(&lang, "account-error-signin-email", None)
                    .unwrap(),
            ),
        )],)
            .into_response();
    }

    tracing::info!(email = form.email, "Sent email signin");

    ([(
        "HX-Trigger",
        toast_header(
            ToastKind::Success,
            &state
                .localizer
                .localize(&lang, "account-check-email", None)
                .unwrap(),
        ),
    )],)
        .into_response()
}

#[derive(Deserialize)]
pub struct CredentialsSubmit {
    username: String,
    password: String,
}

pub async fn route_signin_credentials(
    State(state): State<RouterState>,
    Extension(user): Extension<MaybeUser>,
    Extension(lang): Extension<Languages>,
    cookie_jar: CookieJar,
    Form(form): Form<CredentialsSubmit>,
) -> impl IntoResponse {
    let username_graphemes = form.username.graphemes(true).count();
    if !(3..=30).contains(&username_graphemes) || !(0..=256).contains(&form.username.len()) {
        return ([(
            "HX-Trigger",
            toast_header(
                ToastKind::Error,
                &state
                    .localizer
                    .localize(&lang, "account-error-name-length", None)
                    .unwrap(),
            ),
        )],)
            .into_response();
    }

    let password_graphemes = form.password.graphemes(true).count();
    if !(8..=256).contains(&password_graphemes) || !(0..=256).contains(&form.password.len()) {
        return ([(
            "HX-Trigger",
            toast_header(
                ToastKind::Error,
                &state
                    .localizer
                    .localize(&lang, "account-error-password-length", None)
                    .unwrap(),
            ),
        )],)
            .into_response();
    }

    let avatar = avatar_from_email(&form.username.trim().to_lowercase());

    let location_url = state.settings.read().await.location_url.clone();
    let maybe_user = match state
        .db
        .upsert_user_by_credentials(&form.username, &avatar, &form.password, &location_url)
        .await
    {
        Ok(user) => user,
        Err(e) => {
            let user_id = user.as_ref().map(|u| u.id);
            tracing::error!(error = ?e, user_id, "Failed to upsert user by credentials");
            return ([(
                "HX-Trigger",
                toast_header(ToastKind::Error, "Failed to upsert user by credentials"),
            )],)
                .into_response();
        }
    };

    let Some((user_id, _team_id)) = maybe_user else {
        return ([(
            "HX-Trigger",
            toast_header(
                ToastKind::Error,
                &state
                    .localizer
                    .localize(&lang, "account-error-invalid-credentials", None)
                    .unwrap(),
            ),
        )],)
            .into_response();
    };

    let cookie = match sign_in_cookie(&state, user_id, &cookie_jar).await {
        Ok(cookie) => cookie,
        Err(e) => {
            let user_id = user.as_ref().map(|u| u.id);
            tracing::error!(error = ?e, user_id, "Failed to add user to team");
            return ([(
                "HX-Trigger",
                toast_header(ToastKind::Error, "Failed to add user to team"),
            )],)
                .into_response();
        }
    };

    ([
        ("HX-Redirect", "/team"),
        ("Set-Cookie", cookie.to_string().as_str()),
    ],)
        .into_response()
}

#[derive(Deserialize)]
pub struct EmailSignInParams {
    code: String,
}

pub fn avatar_from_email(email: &str) -> String {
    let digest = ring::digest::digest(
        &ring::digest::SHA256,
        email.trim().to_lowercase().as_bytes(),
    );

    let hash = digest.as_ref().iter().fold(String::new(), |mut output, b| {
        let _ = write!(output, "{:02x}", b);
        output
    });

    format!(
        "https://seccdn.libravatar.org/avatar/{}?s=80&default=retro",
        hash
    )
}

pub async fn route_signin_email_callback(
    State(state): State<RouterState>,
    Extension(user): Extension<MaybeUser>,
    Extension(page): Extension<PageMeta>,
    Query(params): Query<EmailSignInParams>,
    extensions: Extensions,
) -> std::result::Result<impl IntoResponse, Response<Body>> {
    let email = match state
        .db
        .get_email_signin_by_callback_code(&params.code)
        .await
    {
        Err(RhombusError::DatabaseReturnedNoRows) => {
            return Err(error_page(
                StatusCode::NOT_FOUND,
                "Invalid email signin callback code",
                &state,
                &user,
                &page,
            ));
        }
        result => result.map_err_page(&extensions, "Failed to get email by callback code")?,
    };

    Ok(Html(
        state
            .jinja
            .get_template("account/email-signin.html")
            .unwrap()
            .render(context! {
                global => state.global_page_meta,
                page,
                title => format!("Email Sign In | {}", state.global_page_meta.title),
                user,
                email,
                code => params.code,
            })
            .unwrap(),
    ))
}

pub async fn route_signin_email_confirm_callback(
    State(state): State<RouterState>,
    Query(params): Query<EmailSignInParams>,
    Extension(user): Extension<MaybeUser>,
    Extension(page): Extension<PageMeta>,
    cookie_jar: CookieJar,
    extensions: Extensions,
) -> impl IntoResponse {
    let email = match state
        .db
        .verify_email_signin_callback_code(&params.code)
        .await
    {
        Err(RhombusError::DatabaseReturnedNoRows) => {
            return Err(error_page(
                StatusCode::NOT_FOUND,
                "Invalid email signin callback code",
                &state,
                &user,
                &page,
            ));
        }
        result => result.map_err_page(&extensions, "Failed to get email by callback code")?,
    };

    let name = email.split('@').next().unwrap();

    let avatar = avatar_from_email(&email);

    let location_url = state.settings.read().await.location_url.clone();
    let (user_id, _team_id) = state
        .db
        .upsert_user_by_email(name, &email, &avatar, &location_url)
        .await
        .map_err_page(&extensions, "Failed to upsert user by email")?;

    let cookie = sign_in_cookie(&state, user_id, &cookie_jar)
        .await
        .map_err_page(&extensions, "Failed to add user to team")?;
    let mut response = Redirect::temporary("/team").into_response();
    let headers = response.headers_mut();
    headers.insert(header::SET_COOKIE, cookie.to_string().parse().unwrap());
    Ok(response)
}

async fn sign_in_cookie<'a>(
    state: &RouterState,
    user_id: i64,
    cookie_jar: &CookieJar,
) -> crate::Result<Cookie<'static>> {
    let jwt_secret = {
        let settings = state.settings.read().await;
        settings.jwt_secret.clone()
    };

    let now = chrono::Utc::now();
    let iat = now.timestamp();
    let exp = (now + chrono::Duration::hours(72)).timestamp();
    let claims = TokenClaims {
        sub: user_id,
        exp,
        iat,
    };

    if let Some(cookie_invite_token) = cookie_jar.get("rhombus-invite-token").map(|c| c.value()) {
        if let Some(team) = state
            .db
            .get_team_meta_from_invite_token(cookie_invite_token)
            .await?
        {
            state.db.add_user_to_team(user_id, team.id, None).await?;
        };
    }

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(jwt_secret.as_ref()),
    )
    .unwrap();

    Ok(Cookie::build(("rhombus-token", token))
        .path("/")
        .same_site(SameSite::Lax)
        .http_only(true)
        .build())
}

pub async fn route_signout() -> impl IntoResponse {
    let cookie = Cookie::build(("rhombus-token", ""))
        .path("/")
        .removal()
        .same_site(SameSite::Lax)
        .http_only(true);

    let mut response = Redirect::to("/signin").into_response();
    response
        .headers_mut()
        .insert(header::SET_COOKIE, cookie.to_string().parse().unwrap());
    response
}
