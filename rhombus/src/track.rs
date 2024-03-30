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
        state
            .db
            .insert_track(&ip.to_string(), user_agent.as_deref(), now)
            .await;

        // this query does not need to be a part of a transaction because we
        // never expect ips to be deleted, so at this point the foriegn key
        // constraint will never fail.
        if let Some(user_id) = user_id {
            state
                .db
                .insert_track_user(&ip.to_string(), user_agent.as_deref(), user_id, now)
                .await;
        }
    });

    next.run(req).await
}
