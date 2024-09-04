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
        .config_source(rhombus::config::File::with_name("config"))
        .extractor(rhombus::ip::maybe_peer_ip)
        // .upload_provider(rhombus::LocalUploadProvider::new("uploads".into()))
        .plugin(
            rhombus::challenge_loader_plugin::ChallengeLoaderPlugin::new(std::path::PathBuf::from(
                "challenges",
            )),
        )
        .build()
        .await
        .unwrap();

    let listener = tokio::net::TcpListener::bind(":::3000").await.unwrap();
    app.serve(listener).await;
}
