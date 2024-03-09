#![allow(unused_imports)]
#![allow(unused_variables)]
use std::net::SocketAddr;

use axum::{
    body::Body, extract::ConnectInfo, http::Request, middleware::Next, response::IntoResponse,
};
use tracing::info;

pub async fn log_ip(
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    req: Request<Body>,
    next: Next,
) -> impl IntoResponse {
    // info!("ip {}", addr);
    next.run(req).await
}
