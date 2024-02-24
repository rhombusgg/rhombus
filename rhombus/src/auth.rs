use crate::RhombusRouterState;
use axum::{
    body::Body,
    extract::{Query, State},
    http::{header, Request, StatusCode, Uri},
    middleware::Next,
    response::{Html, IntoResponse, Redirect, Response},
    Json,
};
use axum_extra::extract::{
    cookie::{Cookie, SameSite},
    CookieJar,
};
use chrono::{DateTime, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use tera::Context;

#[derive(Debug, Deserialize, sqlx::FromRow, Serialize, Clone)]
pub struct User {
    pub id: i64,
    pub name: String,
    pub email: String,
    pub photo: String,
    #[serde(rename = "createdAt")]
    pub created_at: Option<DateTime<Utc>>,
    #[serde(rename = "updatedAt")]
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TokenClaims {
    pub sub: String,
    pub iat: usize,
    pub exp: usize,
}

#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub message: String,
}

pub async fn auth(
    cookie_jar: CookieJar,
    State(data): State<RhombusRouterState>,
    mut req: Request<Body>,
    next: Next,
) -> Result<impl IntoResponse, (StatusCode, Json<ErrorResponse>)> {
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
        })
        .ok_or_else(|| {
            let json_error = ErrorResponse {
                message: "You are not logged in".to_string(),
            };
            (StatusCode::UNAUTHORIZED, Json(json_error))
        })?;

    let claims = decode::<TokenClaims>(
        &token,
        &DecodingKey::from_secret(data.config.jwt_secret.as_ref()),
        &Validation::default(),
    )
    .map_err(|_| {
        let json_error = ErrorResponse {
            message: "Invalid token".to_string(),
        };
        (StatusCode::UNAUTHORIZED, Json(json_error))
    })?
    .claims;

    let user = sqlx::query_as::<_, User>("SELECT * FROM user WHERE id = $1")
        .bind(claims.sub)
        .fetch_optional(&data.db)
        .await
        .map_err(|e| {
            let json_error = ErrorResponse {
                message: format!("Error fetching user from database: {}", e),
            };
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json_error))
        })?
        .ok_or_else(|| {
            let json_error = ErrorResponse {
                message: "The user belonging to this token no longer exists".to_string(),
            };
            (StatusCode::UNAUTHORIZED, Json(json_error))
        })?;

    req.extensions_mut().insert(user);
    Ok(next.run(req).await)
}

#[derive(Serialize)]
pub struct SignInModel {
    pub discord_signin_url: String,
    pub uri: String,
}

pub async fn route_signin(state: State<RhombusRouterState>, uri: Uri) -> impl IntoResponse {
    let model = SignInModel {
        discord_signin_url: state.discord_signin_url.clone(),
        uri: uri.to_string(),
    };

    let rendered = state
        .tera
        .render("signin.html", &Context::from_serialize(model).unwrap())
        .unwrap();

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

    tracing::info!("Discord profile: {:?}", profile);

    let now = chrono::Utc::now();
    let iat = now.timestamp() as usize;
    let exp = (now + chrono::Duration::minutes(60)).timestamp() as usize;
    let claims: TokenClaims = TokenClaims {
        sub: profile.id,
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

    let mut response = Redirect::permanent("/").into_response();
    response
        .headers_mut()
        .insert(header::SET_COOKIE, cookie.to_string().parse().unwrap());
    response
}

pub async fn route_logout() -> impl IntoResponse {
    let cookie = Cookie::build(("rhombus-token", ""))
        .path("/")
        .max_age(time::Duration::hours(-1))
        .same_site(SameSite::Lax)
        .http_only(true);

    let mut response = Redirect::permanent("/").into_response();
    response
        .headers_mut()
        .insert(header::SET_COOKIE, cookie.to_string().parse().unwrap());
    response
}
