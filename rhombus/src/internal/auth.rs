use std::{fmt::Write, net::IpAddr, num::NonZeroU64, sync::Arc};

use async_hash::{Digest, Sha256};
use axum::{
    body::Body,
    extract::{Query, State},
    http::{
        header::{self, AUTHORIZATION},
        Request, Response, StatusCode, Uri,
    },
    middleware::Next,
    response::{IntoResponse, Redirect},
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

use crate::internal::{
    discord, division::MaxDivisionPlayers, locales::Languages, router::RouterState,
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
    Extension(lang): Extension<Languages>,
    uri: Uri,
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

            state
                .db
                .add_user_to_team(user.id, team.id, Some(user.team_id))
                .await
                .unwrap();
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

    let (discord, location_url, auth) = {
        let settings = state.settings.read().await;
        (
            settings.discord.as_ref().map(|d| (d.client_id, d.autojoin)),
            settings.location_url.clone(),
            settings.auth.clone(),
        )
    };

    let discord_signin_url =
        discord.map(|discord| discord::signin_url(&location_url, discord.0, discord.1));

    let html = state
        .jinja
        .get_template("signin.html")
        .unwrap()
        .render(context! {
            lang => lang,
            user => user,
            uri => uri.to_string(),
            location_url => location_url,
            discord_signin_url => discord_signin_url,
            auth_options => auth,
            og_image => format!("{}/og-image.png", location_url),
            team_name => team_name
        })
        .unwrap();

    Response::builder()
        .header("content-type", "text/html")
        .header("set-cookie", invite_token_cookie.to_string())
        .body(html.into())
        .unwrap()
}

#[derive(Deserialize)]
pub struct DiscordCallback {
    code: Option<String>,
    error: Option<String>,
}

#[derive(Deserialize)]
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

    struct DiscordOAuthSettings {
        client_id: NonZeroU64,
        client_secret: String,
        guild_id: NonZeroU64,
        bot_token: String,
    }

    let (discord, location_url) = {
        let settings = state.settings.read().await;
        (
            settings.discord.as_ref().map(|d| DiscordOAuthSettings {
                client_id: d.client_id,
                client_secret: d.client_secret.clone(),
                guild_id: d.guild_id,
                bot_token: d.bot_token.clone(),
            }),
            settings.location_url.clone(),
        )
    };

    let Some(discord) = discord else {
        let json_error = ErrorResponse {
            message: "Discord is not configured".to_string(),
        };
        return (StatusCode::BAD_REQUEST, Json(json_error)).into_response();
    };

    let bot = state.bot.unwrap();

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
            ("redirect_uri", &format!("{}/signin/discord", location_url)),
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

    let cookie = sign_in_cookie(&state, user_id, team_id, &cookie_jar).await;
    let mut response = Redirect::temporary("/team").into_response();
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
    if form.username.is_empty() || form.username.len() > 255 {
        return Response::builder()
            .body(format!(
                r#"<div id="htmx-toaster" data-toast="error" hx-swap-oob="true">{}</div>"#,
                state
                    .localizer
                    .localize(&lang, "account-error-email-length", None)
                    .unwrap(),
            ))
            .unwrap()
            .into_response();
    }

    let hash = Sha256::digest(form.username.trim().to_lowercase().as_bytes())
        .iter()
        .fold(String::new(), |mut output, b| {
            let _ = write!(output, "{:02x}", b);
            output
        });

    let avatar = format!(
        "https://seccdn.libravatar.org/avatar/{}?s=80&default=retro",
        hash
    );

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

pub async fn route_signin_email_callback(
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

    let hash = Sha256::digest(email.trim().to_lowercase().as_bytes())
        .iter()
        .fold(String::new(), |mut output, b| {
            let _ = write!(output, "{:02x}", b);
            output
        });

    let avatar = format!(
        "https://seccdn.libravatar.org/avatar/{}?s=80&default=retro",
        hash
    );

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

    let default_division_id = state.divisions[0].id;
    state
        .db
        .set_user_division(user_id, team_id, default_division_id, true)
        .await
        .unwrap();
    state
        .db
        .set_team_division(team_id, default_division_id, true)
        .await
        .unwrap();

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
            state
                .db
                .add_user_to_team(user_id, team.id, None)
                .await
                .unwrap();
        }
    }

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(jwt_secret.as_ref()),
    )
    .unwrap();

    Cookie::build(("rhombus-token", token.to_owned()))
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
