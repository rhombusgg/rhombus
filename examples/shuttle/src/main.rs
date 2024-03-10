#[shuttle_runtime::main]
async fn main(
    #[shuttle_shared_db::Postgres] pool: sqlx::PgPool,
    #[shuttle_secrets::Secrets] secrets: shuttle_secrets::SecretStore,
) -> shuttle_axum::ShuttleAxum {
    let app = rhombus::Rhombus::new(
        pool,
        rhombus::Config {
            location_url: "http://localhost:3001".to_string(),
            // location_url: "https://rhombus-rs.shuttleapp.rs".to_string(),
            discord_client_id: secrets.get("DISCORD_CLIENT_ID").unwrap(),
            discord_client_secret: secrets.get("DISCORD_CLIENT_SECRET").unwrap(),
            discord_bot_token: std::env::var("DISCORD_TOKEN").unwrap(),
            discord_guild_id: std::env::var("DISCORD_GUILD_ID").unwrap(),
            jwt_secret: secrets.get("JWT_SECRET").unwrap(),
        },
    )
    .build()
    .await;

    Ok(app.into())
}
