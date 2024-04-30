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
