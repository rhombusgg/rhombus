use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().unwrap();

    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env()
                .or_else(|_| EnvFilter::try_new("rhombus=trace"))
                .unwrap(),
        )
        .init();

    let app = rhombus::Builder::default()
        .load_env()
        .database("postgres://postgres:password@localhost".into())
        .plugin(plugin::MyPlugin::new(3))
        .build()
        .await
        .unwrap();

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    rhombus::axum::serve(
        listener,
        app.into_make_service_with_connect_info::<std::net::SocketAddr>(),
    )
    .await
    .unwrap();
}
