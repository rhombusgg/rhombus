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

    let app = rhombus::Rhombus::new(rhombus::Config {
        location_url: "http://localhost:3000".to_string(),
        discord_client_id: std::env::var("DISCORD_CLIENT_ID").unwrap(),
        discord_client_secret: std::env::var("DISCORD_CLIENT_SECRET").unwrap(),
        discord_bot_token: std::env::var("DISCORD_TOKEN").unwrap(),
        discord_guild_id: std::env::var("DISCORD_GUILD_ID").unwrap(),
        jwt_secret: std::env::var("JWT_SECRET").unwrap(),
    })
    .connect_from_url("postgres://postgres:password@localhost")
    .build()
    .await
    .unwrap();

    rhombus::serve(app, "0.0.0.0:3000").await.unwrap();
}
