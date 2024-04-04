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

    let app = rhombus::Builder::new()
        .load_env()
        .location_url("http://localhost:3000")
        .database("file://rhombus.db".into())
        // .database("postgres://postgres:password@localhost".into())
        .build()
        .await
        .unwrap();

    rhombus::serve(app, "0.0.0.0:3000").await.unwrap();
}
