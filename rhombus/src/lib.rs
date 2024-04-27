#![forbid(unsafe_code)]

pub mod account;
pub mod auth;
pub mod builder;
pub mod challenges;
pub mod command_palette;
pub mod database;
pub mod errors;
pub mod home;
pub mod ip;
pub mod locales;
pub mod open_graph;
pub mod plugin;
pub mod settings;
pub mod team;

#[cfg(feature = "libsql")]
pub mod backend_libsql;

#[cfg(feature = "postgres")]
pub mod backend_postgres;

pub use axum;
pub use config;

pub use builder::Builder;
pub use builder::RouterState;
pub use errors::Result;

use axum::Router;

use std::net::SocketAddr;
use tokio::net::TcpListener;
use tracing::info;

pub async fn serve_systemfd(router: Router) -> std::result::Result<(), std::io::Error> {
    let listener = listenfd::ListenFd::from_env()
        .take_tcp_listener(0)?
        .unwrap();
    tracing::debug!("restored socket from listenfd");
    listener.set_nonblocking(true).unwrap();
    let listener = TcpListener::from_std(listener).unwrap();

    info!(
        address = listener.local_addr().unwrap().to_string(),
        "listening on"
    );
    axum::serve(
        listener,
        router.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await?;

    Ok(())
}
