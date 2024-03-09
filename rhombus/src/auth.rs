use crate::RhombusRouterState;
use axum::{
    body::Body,
    extract::{Query, State},
    http::{header, Request, StatusCode, Uri},
    middleware::Next,
    response::{Html, IntoResponse, Redirect, Response},
    Extension, Json,
};
use axum_extra::extract::{
    cookie::{Cookie, SameSite},
    CookieJar,
};
use chrono::{DateTime, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, sqlx::FromRow, Serialize, Clone)]
pub struct User {
    pub id: i64,
    pub name: String,
    pub email: String,
    pub avatar: String,
    pub discord_id: String,
    #[serde(rename = "createdAt")]
    pub created_at: Option<DateTime<Utc>>,
    #[serde(rename = "updatedAt")]
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TokenClaims {
    pub sub: i64,
    pub name: String,
    pub email: String,
    pub avatar: String,
    pub discord_id: String,
    pub iat: usize,
    pub exp: usize,
}

#[derive(Debug, Serialize, Clone)]
pub struct ClientUser {
    pub id: i64,
    pub name: String,
    pub email: String,
    pub avatar: String,
    pub discord_id: String,
}

pub type MaybeClientUser = Option<ClientUser>;

#[derive(Debug, Serialize, Clone)]
pub struct ErrorResponse {
    pub message: String,
}

pub async fn enforce_auth_middleware(
    Extension(user): Extension<MaybeClientUser>,
    mut req: Request<Body>,
    next: Next,
) -> Result<impl IntoResponse, (StatusCode, Json<ErrorResponse>)> {
    if user.is_none() {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(ErrorResponse {
                message: "Unauthorized".to_string(),
            }),
        ));
    }
    let user = user.unwrap();

    req.extensions_mut().insert(user);

    Ok(next.run(req).await)
}

pub async fn auth_injector_middleware(
    cookie_jar: CookieJar,
    State(data): State<RhombusRouterState>,
    mut req: Request<Body>,
    next: Next,
) -> impl IntoResponse {
    let token = cookie_jar
        .get("rhombus-token")
        .map(|cookie| cookie.value().to_string())
        .or_else(|| {
            req.headers()
                .get(header::AUTHORIZATION)
                .and_then(|auth_header| auth_header.to_str().ok())
                .and_then(|auth_value| {
                    if auth_value.starts_with("Bearer ") {
                        Some(auth_value[7..].to_owned())
                    } else {
                        None
                    }
                })
        });

    if token.is_none() {
        let client_user: MaybeClientUser = None;
        req.extensions_mut().insert(client_user);
        return next.run(req).await;
    }
    let token = token.unwrap();

    let claims = decode::<TokenClaims>(
        &token,
        &DecodingKey::from_secret(data.config.jwt_secret.as_ref()),
        &Validation::default(),
    );
    if claims.is_err() {
        let client_user: MaybeClientUser = None;
        req.extensions_mut().insert(client_user);
        return next.run(req).await;
    }
    let claims = claims.unwrap().claims;

    let client_user: MaybeClientUser = Some(ClientUser {
        id: claims.sub,
        name: claims.name,
        email: claims.email,
        avatar: claims.avatar,
        discord_id: claims.discord_id,
    });
    req.extensions_mut().insert(client_user);
    next.run(req).await
}

pub async fn route_signin(
    state: State<RhombusRouterState>,
    Extension(user): Extension<MaybeClientUser>,
    uri: Uri,
) -> impl IntoResponse {
    let mut context = tera::Context::new();
    context.insert("user", &user);
    context.insert("uri", &uri.to_string());
    context.insert("discord_signin_url", &state.discord_signin_url);
    let rendered = state.tera.render("signin.html", &context).unwrap();

    Html(rendered)
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

pub async fn route_discord_callback(
    state: State<RhombusRouterState>,
    params: Query<DiscordCallback>,
) -> Response {
    if let Some(error) = &params.error {
        tracing::error!("Discord returned an error: {}", error);
        let json_error = ErrorResponse {
            message: format!("Discord returned an error: {}", error),
        };
        return (StatusCode::BAD_REQUEST, Json(json_error)).into_response();
    }

    let code = if let Some(code) = &params.code {
        code
    } else {
        let json_error = ErrorResponse {
            message: "Discord did not return a code".to_string(),
        };
        return (StatusCode::BAD_REQUEST, Json(json_error)).into_response();
    };

    let client = Client::new();
    let res = client
        .post("https://discord.com/api/oauth2/token")
        .header(
            reqwest::header::CONTENT_TYPE,
            "application/x-www-form-urlencoded",
        )
        .basic_auth(
            state.config.discord_client_id.clone(),
            Some(state.config.discord_client_secret.clone()),
        )
        .form(&[
            ("grant_type", "authorization_code"),
            ("code", code),
            (
                "redirect_uri",
                &format!("{}/signin/discord", state.config.location_url),
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
        .bearer_auth(oauth_token.access_token)
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

    let user = sqlx::query!(
        r#"
        INSERT INTO "User" (name, email, avatar, discord_id) VALUES ($1, $2, $3, $4)
        ON CONFLICT (discord_id) DO UPDATE SET name = $1, email = $2, updated_at = now()
        RETURNING id
        "#,
        profile.global_name,
        profile.email,
        avatar,
        profile.id,
    )
    .fetch_one(&state.db)
    .await
    .unwrap();

    let now = chrono::Utc::now();
    let iat = now.timestamp() as usize;
    let exp = (now + chrono::Duration::minutes(60)).timestamp() as usize;
    let claims = TokenClaims {
        sub: user.id,
        name: profile.global_name,
        email: profile.email,
        avatar,
        discord_id: profile.id,
        exp,
        iat,
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(state.config.jwt_secret.as_ref()),
    )
    .unwrap();

    let cookie = Cookie::build(("rhombus-token", token.to_owned()))
        .path("/")
        .max_age(time::Duration::hours(1))
        .same_site(SameSite::Lax)
        .http_only(true);

    let mut response = Redirect::permanent("/account").into_response();
    response
        .headers_mut()
        .insert(header::SET_COOKIE, cookie.to_string().parse().unwrap());
    response
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
