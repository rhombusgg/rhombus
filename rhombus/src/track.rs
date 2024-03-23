use axum::{
    body::Body,
    extract::{ConnectInfo, State},
    http::{header::USER_AGENT, Request},
    middleware::Next,
    response::IntoResponse,
    Extension,
};
use std::net::SocketAddr;

use crate::{auth::MaybeClientUser, RhombusRouterState};

/// Middleware to log the IP and user agent of the client in the database as track.
/// Associates the track with the user if the user is logged in. Runs asynchronously,
/// so it does not block the request and passes on to the next middleware immediately.
pub async fn track(
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    Extension(user): Extension<MaybeClientUser>,
    State(state): State<RhombusRouterState>,
    req: Request<Body>,
    next: Next,
) -> impl IntoResponse {
    let ip = addr.ip();
    let user_id = user.as_ref().map(|u| u.id);
    let user_agent = req
        .headers()
        .get(&USER_AGENT)
        .map(|header| header.to_str().unwrap().to_string());

    tokio::spawn(async move {
        let now = chrono::Utc::now();
        sqlx::query(
            r#"
            INSERT INTO Track (ip, user_agent, last_seen_at) VALUES ($1, $2, $3)
            ON CONFLICT (ip, user_agent) DO UPDATE SET last_seen_at = $3
            "#,
        )
        .bind(ip.to_string())
        .bind(&user_agent)
        .bind(now)
        .execute(&state.db)
        .await
        .unwrap();

        // this query does not need to be a part of a transaction because we
        // never expect ips to be deleted, so at this point the foriegn key
        // constraint will never fail.
        if let Some(user_id) = user_id {
            sqlx::query(
                r#"
                INSERT INTO TrackConnection (ip, user_agent, user_id, last_seen_at) VALUES ($1, $2, $3, $4)
                ON CONFLICT (ip, user_agent, user_id) DO UPDATE SET last_seen_at = $4
                "#,
            )
            .bind(ip.to_string())
            .bind(&user_agent)
            .bind(user_id)
            .bind(now)
            .execute(&state.db)
            .await
            .unwrap();
        }
    });

    next.run(req).await
}
