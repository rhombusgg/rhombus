use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env()
                .or_else(|_| EnvFilter::try_new("rhombus=trace"))
                .unwrap(),
        )
        .init();

    let app = rhombus::Builder::default()
        .load_env()
        .config_override("location_url", "http://localhost:3000")
        .database("file://rhombus.db".into())
        .config_source(rhombus::config::File::with_name("config"))
        .extractor(rhombus::ip::maybe_peer_ip)
        .build()
        .await
        .unwrap();

    rhombus::serve(app, "0.0.0.0:3000").await.unwrap();
}
