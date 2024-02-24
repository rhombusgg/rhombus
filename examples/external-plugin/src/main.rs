#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .event_format(
            tracing_subscriber::fmt::format()
                .with_file(true)
                .with_line_number(true),
        )
        .init();

    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(5)
        .connect("postgres://postgres:password@localhost")
        .await
        .unwrap();

    dotenvy::dotenv().unwrap();

    let app = rhombus::Rhombus::new(
        pool,
        rhombus::Config {
            location_url: "http://localhost:3000".to_string(),
            discord_client_id: std::env::var("DISCORD_CLIENT_ID").unwrap(),
            discord_client_secret: std::env::var("DISCORD_CLIENT_SECRET").unwrap(),
            jwt_secret: std::env::var("JWT_SECRET").unwrap(),
        },
    )
    .plugin(&plugin::MyPlugin::new(3))
    .build()
    .await;

    rhombus::serve(app, "127.0.0.1:3000").await.unwrap();
}
