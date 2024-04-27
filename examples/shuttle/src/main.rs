#[shuttle_runtime::main]
async fn main(
    #[shuttle_shared_db::Postgres] pool: sqlx::PgPool,
    #[shuttle_runtime::Secrets] secrets: shuttle_runtime::SecretStore,
) -> shuttle_axum::ShuttleAxum {
    let app = rhombus::Builder::default()
        .load_env()
        .config_override(
            "discord.client_id",
            secrets.get("RHOMBUS__DISCORD__CLIENT_ID").unwrap(),
        )
        .config_override(
            "discord.client_secret",
            secrets.get("RHOMBUS__DISCORD__CLIENT_SECRET").unwrap(),
        )
        .config_override(
            "discord.guild_id",
            secrets.get("RHOMBUS__DISCORD__GUILD_ID").unwrap(),
        )
        .config_override(
            "discord.bot_token",
            secrets.get("RHOMBUS__DISCORD__BOT_TOKEN").unwrap(),
        )
        .config_override("jwt_secret", secrets.get("RHOMBUS__JWT_SECRET").unwrap())
        .config_override(
            "location_url",
            secrets.get("RHOMBUS__LOCATION_URL").unwrap(),
        )
        .database(pool.into())
        .build()
        .await
        .unwrap();

    Ok(app.into())
}
