use std::net::IpAddr;
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

    let ip = reqwest::get("https://icanhazip.com")
        .await
        .unwrap()
        .text()
        .await
        .unwrap()
        .trim()
        .parse::<IpAddr>()
        .unwrap();

    let app = rhombus::Builder::default()
        .load_env()
        .config_source(rhombus::config::File::with_name("config"))
        // .plugin(ChallengeLoaderPlugin::new(PathBuf::from("challenges")))
        .extractor(move |_, _| Some(ip))
        .build()
        .await
        .unwrap();

    let listener = tokio::net::TcpListener::bind(":::3000").await.unwrap();
    app.serve(listener).await;
}
