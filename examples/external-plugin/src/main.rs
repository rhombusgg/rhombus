use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().unwrap();

    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env()
                .or_else(|_| EnvFilter::try_new("rhombus=trace,plugin=trace"))
                .unwrap(),
        )
        .init();

    let app = rhombus::Builder::default()
        .load_env()
        // .config_override("database_url", "postgres://postgres:password@localhost")
        .config_source(rhombus::config::File::with_name("config"))
        .upload_provider(rhombus::LocalUploadProvider::new("uploads".into()))
        .plugin(plugin::MyPlugin::new(3))
        .plugin(
            rhombus::challenge_loader_plugin::ChallengeLoaderPlugin::new(std::path::PathBuf::from(
                "challenges",
            )),
        )
        .build()
        .await
        .unwrap();

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    app.serve(listener).await;
}
