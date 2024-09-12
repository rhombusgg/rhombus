use std::{fmt::Write, net::IpAddr, num::NonZeroU64, sync::Arc};

use async_hash::{Digest, Sha256};
use axum::{
    body::Body,
    extract::{Query, State},
    http::{
        header::{self, AUTHORIZATION},
        Request, Response, StatusCode,
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
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;
use unicode_segmentation::UnicodeSegmentation;

use crate::internal::{
    division::MaxDivisionPlayers,
    locales::Languages,
    router::RouterState,
    routes::{meta::PageMeta, team::create_team_invite_token},
};

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
            req.extensions_mut().insert(Some(token_data.claims.clone()));
            req.extensions_mut().insert(token_data.claims.clone());
            if let Ok(user) = state.db.get_user_from_id(token_data.claims.sub).await {
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
    state: State<RouterState>,
    Extension(user): Extension<MaybeUser>,
    Extension(page): Extension<PageMeta>,
    params: Query<SignInParams>,
) -> Response<Body> {
    let (invite_token_cookie, team_name) = if let Some(url_invite_token) = &params.token {
        let team = state
            .db
            .get_team_meta_from_invite_token(url_invite_token)
            .await
            .unwrap_or(None);

        if let (Some(team), Some(user)) = (&team, &user) {
            // you cannot join a team if your current team has more than just you on it
            let old_team = state.db.get_team_from_id(user.team_id).await.unwrap();
            if old_team.users.len() > 1 {
                return Redirect::temporary("/team").into_response();
            }

            // you cannot join a team if the new team if, as a result of you joining it would
            // lead to the team having more players than the minimum required by any division
            let team_divisions = state.db.get_team_divisions(team.id).await.unwrap();
            let user_divisions = state.db.get_user_divisions(user.id).await.unwrap();
            let new_team = state.db.get_team_from_id(team.id).await.unwrap();
            let min_players = state
                .divisions
                .iter()
                .filter(|division| {
                    team_divisions.contains(&division.id) && user_divisions.contains(&division.id)
                })
                .filter_map(|division| match division.max_players {
                    MaxDivisionPlayers::Unlimited => None,
                    MaxDivisionPlayers::Limited(max) => Some(max),
                })
                .min()
                .map(MaxDivisionPlayers::Limited)
                .unwrap_or(MaxDivisionPlayers::Unlimited);
            match min_players {
                MaxDivisionPlayers::Unlimited => {}
                MaxDivisionPlayers::Limited(min_players) => {
                    if new_team.users.len() >= min_players.get() as usize {
                        return Redirect::temporary("/team").into_response();
                    }
                }
            }

            state.db.add_user_to_team(user.id, team.id).await.unwrap();
            return Redirect::to("/team").into_response();
        }

        (
            Cookie::build(("rhombus-invite-token", url_invite_token))
                .path("/")
                .max_age(time::Duration::hours(1))
                .same_site(SameSite::Lax)
                .http_only(true),
            team.map(|t| t.name.clone()),
        )
    } else {
        (
            Cookie::build(("rhombus-invite-token", ""))
                .path("/")
                .max_age(time::Duration::hours(-1))
                .same_site(SameSite::Lax)
                .http_only(true),
            None,
        )
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

    Response::builder()
        .header("content-type", "text/html")
        .header("set-cookie", invite_token_cookie.to_string())
        .body(html.into())
        .unwrap()
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiscordOAuthStateClaims {
    state: String,
    iat: i64,
    exp: i64,
}

pub async fn route_signin_discord(state: State<RouterState>) -> impl IntoResponse {
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
        .max_age(time::Duration::hours(1))
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
    email: String,
    username: String,
    avatar: Option<String>,
    global_name: String,
    discriminator: Option<String>,
}

pub async fn route_signin_discord_callback(
    state: State<RouterState>,
    user: Extension<MaybeUser>,
    params: Query<DiscordCallback>,
    cookie_jar: CookieJar,
) -> impl IntoResponse {
    let Some(discord_oauth_cookie) = cookie_jar
        .get("rhombus-oauth-discord")
        .map(|cookie| cookie.value())
    else {
        let json_error = ErrorResponse {
            message: "State not set".to_string(),
        };
        return (StatusCode::BAD_REQUEST, Json(json_error)).into_response();
    };

    if let Some(error) = &params.error {
        tracing::error!("Discord returned an error: {}", error);
        let json_error = ErrorResponse {
            message: format!("Discord returned an error: {}", error),
        };
        return (StatusCode::BAD_REQUEST, Json(json_error)).into_response();
    }

    let Some(code) = &params.code else {
        let json_error = ErrorResponse {
            message: "Discord did not return a code".to_string(),
        };
        return (StatusCode::BAD_REQUEST, Json(json_error)).into_response();
    };

    let Some(discord_oauth_state) = &params.state else {
        let json_error = ErrorResponse {
            message: "Discord did not return a state".to_string(),
        };
        return (StatusCode::BAD_REQUEST, Json(json_error)).into_response();
    };

    if discord_oauth_cookie != discord_oauth_state {
        let json_error = ErrorResponse {
            message: "State mismatch".to_string(),
        };
        return (StatusCode::BAD_REQUEST, Json(json_error)).into_response();
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

    if decode::<DiscordOAuthStateClaims>(
        discord_oauth_cookie,
        &DecodingKey::from_secret(jwt_secret.as_ref()),
        &Validation::default(),
    )
    .is_err()
    {
        let json_error = ErrorResponse {
            message: "Invalid state".to_string(),
        };
        return (StatusCode::BAD_REQUEST, Json(json_error)).into_response();
    };

    let Some(discord) = discord else {
        let json_error = ErrorResponse {
            message: "Discord is not configured".to_string(),
        };
        return (StatusCode::BAD_REQUEST, Json(json_error)).into_response();
    };

    let bot = state.bot.as_ref().unwrap();

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
            ("code", code),
            (
                "redirect_uri",
                &format!("{}/signin/discord/callback", location_url),
            ),
        ])
        .send()
        .await
        .unwrap();

    if !res.status().is_success() {
        let json_error = ErrorResponse {
            message: format!("Discord returned an error: {:?}", res.text().await),
        };
        return (StatusCode::BAD_REQUEST, Json(json_error)).into_response();
    }

    let oauth_token = res.json::<DiscordOAuthToken>().await.unwrap();

    let res = client
        .get("https://discord.com/api/users/@me")
        .bearer_auth(&oauth_token.access_token)
        .send()
        .await
        .unwrap();
    if !res.status().is_success() {
        let json_error = ErrorResponse {
            message: format!("Discord returned an error: {:?}", res.text().await),
        };
        return (StatusCode::BAD_REQUEST, Json(json_error)).into_response();
    }

    let profile = res.json::<DiscordProfile>().await.unwrap();

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
        .unwrap();
    if !res.status().is_success() {
        let json_error = ErrorResponse {
            message: format!("Discord returned an error: {:?}", res.text().await),
        };
        return (StatusCode::BAD_REQUEST, Json(json_error)).into_response();
    }

    let discord_id = profile.id.parse::<NonZeroU64>().unwrap();
    if let Err(err) = bot.verify_user(discord_id).await {
        let json_error = ErrorResponse {
            message: format!("Discord returned an error: {:?}", err),
        };
        return (StatusCode::BAD_REQUEST, Json(json_error)).into_response();
    }

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

    let Ok((user_id, team_id)) = state
        .db
        .upsert_user_by_discord_id(
            &profile.global_name,
            &profile.email,
            &avatar,
            discord_id,
            user.as_ref().map(|u| u.id),
        )
        .await
    else {
        return Redirect::temporary("/signin").into_response();
    };

    let unset_oauth_state_cookie = Cookie::build(("rhombus-oauth-discord", ""))
        .path("/")
        .max_age(time::Duration::hours(-1))
        .same_site(SameSite::Lax)
        .http_only(true);

    let cookie = sign_in_cookie(&state, user_id, team_id, &cookie_jar).await;
    let mut response = Redirect::temporary("/team").into_response();
    let headers = response.headers_mut();
    headers.insert(header::SET_COOKIE, cookie.to_string().parse().unwrap());
    headers.append(
        header::SET_COOKIE,
        unset_oauth_state_cookie.to_string().parse().unwrap(),
    );
    response
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
    state: State<RouterState>,
    user: Extension<MaybeUser>,
    params: Query<CTFtimeCallback>,
    cookie_jar: CookieJar,
) -> impl IntoResponse {
    if user.is_some() {
        return Redirect::temporary("/signin").into_response();
    }

    let Some(ctftime_oauth_cookie) = cookie_jar
        .get("rhombus-oauth-ctftime")
        .map(|cookie| cookie.value())
    else {
        let json_error = ErrorResponse {
            message: "State not set".to_string(),
        };
        return (StatusCode::BAD_REQUEST, Json(json_error)).into_response();
    };

    if ctftime_oauth_cookie != params.state {
        let json_error = ErrorResponse {
            message: "State mismatch".to_string(),
        };
        return (StatusCode::BAD_REQUEST, Json(json_error)).into_response();
    }

    let (ctftime_settings, jwt_secret) = {
        let settings = state.settings.read().await;
        (settings.ctftime.clone(), settings.jwt_secret.clone())
    };

    if decode::<DiscordOAuthStateClaims>(
        ctftime_oauth_cookie
            .replace("______________________________________", ".")
            .as_str(),
        &DecodingKey::from_secret(jwt_secret.as_ref()),
        &Validation::default(),
    )
    .is_err()
    {
        let json_error = ErrorResponse {
            message: "Invalid state".to_string(),
        };
        return (StatusCode::BAD_REQUEST, Json(json_error)).into_response();
    };

    let Some(ctftime_settings) = ctftime_settings else {
        let json_error = ErrorResponse {
            message: "CTFtime is not configured".to_string(),
        };
        return (StatusCode::BAD_REQUEST, Json(json_error)).into_response();
    };

    let Some(ctftime_client_secret) = ctftime_settings.client_secret else {
        let json_error = ErrorResponse {
            message: "CTFtime client secret is not configured".to_string(),
        };
        return (StatusCode::BAD_REQUEST, Json(json_error)).into_response();
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
        .unwrap();

    if res.status() != StatusCode::OK {
        let json_error = ErrorResponse {
            message: format!("Invalid CTFtime oauth token: {:?}", res.text().await),
        };
        return (StatusCode::BAD_REQUEST, Json(json_error)).into_response();
    }

    let Ok(oauth_token) = res.json::<CTFtimeOAuthToken>().await else {
        let json_error = ErrorResponse {
            message: "Invalid CTFtime oauth token".to_string(),
        };
        return (StatusCode::BAD_REQUEST, Json(json_error)).into_response();
    };

    let res = client
        .get("https://oauth.ctftime.org/user")
        .bearer_auth(&oauth_token.access_token)
        .send()
        .await
        .unwrap();
    if !res.status().is_success() {
        let json_error = ErrorResponse {
            message: format!("Discord returned an error: {:?}", res.text().await),
        };
        return (StatusCode::BAD_REQUEST, Json(json_error)).into_response();
    }

    let user_data = res.json::<CTFtimeUserData>().await.unwrap();

    let Ok((user_id, team_id, invite_token)) = state
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
        )
        .await
    else {
        tracing::info!(
            ctftime_user_id = user_data.id,
            ctftime_team_id = user_data.team.id,
            "failed to upsert user by ctftime"
        );
        return Redirect::temporary("/signin").into_response();
    };

    let cookie = sign_in_cookie(&state, user_id, team_id, &cookie_jar).await;
    let mut response = if let Some(invite_token) = invite_token {
        Redirect::temporary(format!("/signin?token={}", invite_token).as_str()).into_response()
    } else {
        Redirect::temporary("/team").into_response()
    };
    let headers = response.headers_mut();
    headers.insert(header::SET_COOKIE, cookie.to_string().parse().unwrap());
    response
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CTFtimeOAuthStateClaims {
    state: String,
    iat: i64,
    exp: i64,
}

pub async fn route_signin_ctftime(state: State<RouterState>) -> impl IntoResponse {
    let (jwt_secret, location_url, client_id) = {
        let settings = state.settings.read().await;

        if let Some(ref ctftime) = settings.ctftime {
            (
                settings.jwt_secret.clone(),
                settings.location_url.clone(),
                ctftime.client_id,
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
    // then re-replaced in [[route_signin_discord_callback]]
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
        .max_age(time::Duration::hours(1))
        .same_site(SameSite::Lax)
        .http_only(true)
        .build();

    let mut response = Redirect::temporary(&signin_url).into_response();
    let headers = response.headers_mut();
    headers.insert(header::SET_COOKIE, cookie.to_string().parse().unwrap());
    response
}

#[derive(Deserialize)]
pub struct EmailSubmit {
    email: String,
}

pub async fn route_signin_email(
    state: State<RouterState>,
    Extension(lang): Extension<Languages>,
    Extension(ip): Extension<Option<IpAddr>>,
    Form(form): Form<EmailSubmit>,
) -> impl IntoResponse {
    if form.email.is_empty() || form.email.len() > 255 {
        return Response::builder()
            .body(format!(
                r#"<div id="htmx-toaster" data-toast="error" hx-swap-oob="true">{}</div>"#,
                state
                    .localizer
                    .localize(&lang, "account-error-email-length", None)
                    .unwrap(),
            ))
            .unwrap();
    }

    let outbound_mailer = state.outbound_mailer.as_ref().unwrap();

    let code = state
        .db
        .create_email_signin_callback_code(&form.email)
        .await
        .unwrap();

    if outbound_mailer
        .send_email_signin(ip.map(|ip| ip.to_string()).as_deref(), &form.email, &code)
        .await
        .is_err()
    {
        return Response::builder()
            .body(format!(
                r#"<div id="htmx-toaster" data-toast="error" hx-swap-oob="true">{}</div>"#,
                state
                    .localizer
                    .localize(&lang, "account-error-signin-email", None)
                    .unwrap(),
            ))
            .unwrap();
    }

    tracing::info!(email = form.email, "sent email signin");

    Response::builder()
        .body(format!(
            r#"<div id="htmx-toaster" data-toast="success" hx-swap-oob="true">{}</div>"#,
            state
                .localizer
                .localize(&lang, "account-check-email", None)
                .unwrap(),
        ))
        .unwrap()
}

#[derive(Deserialize)]
pub struct CredentialsSubmit {
    username: String,
    password: String,
}

pub async fn route_signin_credentials(
    state: State<RouterState>,
    Extension(lang): Extension<Languages>,
    cookie_jar: CookieJar,
    Form(form): Form<CredentialsSubmit>,
) -> impl IntoResponse {
    let username_graphemes = form.username.graphemes(true).count();
    if !(3..=30).contains(&username_graphemes) {
        return Response::builder()
            .body(format!(
                r#"<div id="htmx-toaster" data-toast="error" hx-swap-oob="true">{}</div>"#,
                state
                    .localizer
                    .localize(&lang, "account-error-name-length", None)
                    .unwrap(),
            ))
            .unwrap()
            .into_response();
    }

    let password_graphemes = form.password.graphemes(true).count();
    if !(8..=256).contains(&password_graphemes) {
        return Response::builder()
            .body(format!(
                r#"<div id="htmx-toaster" data-toast="error" hx-swap-oob="true">{}</div>"#,
                state
                    .localizer
                    .localize(&lang, "account-error-password-length", None)
                    .unwrap(),
            ))
            .unwrap()
            .into_response();
    }

    let avatar = avatar_from_email(&form.username.trim().to_lowercase());

    let Some((user_id, team_id)) = state
        .db
        .upsert_user_by_credentials(&form.username, &avatar, &form.password)
        .await
        .unwrap()
    else {
        return Response::builder()
            .body(format!(
                r#"<div id="htmx-toaster" data-toast="error" hx-swap-oob="true">{}</div>"#,
                state
                    .localizer
                    .localize(&lang, "account-error-invalid-credentials", None)
                    .unwrap(),
            ))
            .unwrap()
            .into_response();
    };

    let cookie = sign_in_cookie(&state, user_id, team_id, &cookie_jar).await;

    Response::builder()
        .header("HX-Redirect", "/team")
        .header(header::SET_COOKIE, cookie.to_string())
        .body("".to_owned())
        .unwrap()
        .into_response()
}

#[derive(Deserialize)]
pub struct EmailSignInParams {
    code: String,
}

pub fn avatar_from_email(email: &str) -> String {
    let hash = Sha256::digest(email.trim().to_lowercase().as_bytes())
        .iter()
        .fold(String::new(), |mut output, b| {
            let _ = write!(output, "{:02x}", b);
            output
        });

    format!(
        "https://seccdn.libravatar.org/avatar/{}?s=80&default=retro",
        hash
    )
}

pub async fn route_signin_email_callback(
    state: State<RouterState>,
    Extension(user): Extension<MaybeUser>,
    Extension(page): Extension<PageMeta>,
    params: Query<EmailSignInParams>,
) -> impl IntoResponse {
    let Ok(email) = state
        .db
        .get_email_signin_by_callback_code(&params.code)
        .await
    else {
        return Response::builder()
            .status(404)
            .header("Content-Type", "application/json")
            .body(Body::from(
                json!({
                    "message": "Invalid email signin callback code. Please try again."
                })
                .to_string(),
            ))
            .unwrap()
            .into_response();
    };

    Html(
        state
            .jinja
            .get_template("email-signin.html")
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
    )
    .into_response()
}

pub async fn route_signin_email_confirm_callback(
    state: State<RouterState>,
    params: Query<EmailSignInParams>,
    cookie_jar: CookieJar,
) -> impl IntoResponse {
    let Ok(email) = state
        .db
        .verify_email_signin_callback_code(&params.code)
        .await
    else {
        tracing::info!(code = params.code, "invalid email signin callback code");
        return Redirect::temporary("/signin").into_response();
    };

    let name = email.split('@').next().unwrap();

    let avatar = avatar_from_email(&email);

    let Ok((user_id, team_id)) = state.db.upsert_user_by_email(name, &email, &avatar).await else {
        tracing::info!(email, "failed to upsert user by email");
        return Redirect::temporary("/signin").into_response();
    };

    let cookie = sign_in_cookie(&state, user_id, team_id, &cookie_jar).await;
    let mut response = Redirect::temporary("/team").into_response();
    let headers = response.headers_mut();
    headers.insert(header::SET_COOKIE, cookie.to_string().parse().unwrap());
    response
}

async fn sign_in_cookie(
    state: &State<RouterState>,
    user_id: i64,
    team_id: i64,
    cookie_jar: &CookieJar,
) -> Cookie<'static> {
    let jwt_secret = {
        let settings = state.settings.read().await;
        settings.jwt_secret.clone()
    };

    for division in state.divisions.iter() {
        let eligible = division
            .division_eligibility
            .is_user_eligible(user_id)
            .await;

        state
            .db
            .set_user_division(user_id, team_id, division.id, eligible.is_ok())
            .await
            .unwrap();
    }

    let now = chrono::Utc::now();
    let iat = now.timestamp();
    let exp = (now + chrono::Duration::try_hours(72).unwrap()).timestamp();
    let claims = TokenClaims {
        sub: user_id,
        exp,
        iat,
    };

    if let Some(cookie_invite_token) = cookie_jar.get("rhombus-invite-token").map(|c| c.value()) {
        if let Some(team) = state
            .db
            .get_team_meta_from_invite_token(cookie_invite_token)
            .await
            .unwrap_or(None)
        {
            state.db.add_user_to_team(user_id, team.id).await.unwrap();
        }
    }

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(jwt_secret.as_ref()),
    )
    .unwrap();

    Cookie::build(("rhombus-token", token))
        .path("/")
        .max_age(time::Duration::hours(72))
        .same_site(SameSite::Lax)
        .http_only(true)
        .build()
}

pub async fn route_signout() -> impl IntoResponse {
    let cookie = Cookie::build(("rhombus-token", ""))
        .path("/")
        .max_age(time::Duration::hours(-1))
        .same_site(SameSite::Lax)
        .http_only(true);

    let mut response = Redirect::to("/signin").into_response();
    response
        .headers_mut()
        .insert(header::SET_COOKIE, cookie.to_string().parse().unwrap());
    response
}
