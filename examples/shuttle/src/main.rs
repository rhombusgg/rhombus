#[shuttle_runtime::main]
async fn main(
    #[shuttle_shared_db::Postgres] pool: sqlx::PgPool,
    #[shuttle_runtime::Secrets] secrets: shuttle_runtime::SecretStore,
) -> shuttle_axum::ShuttleAxum {
    let app = rhombus::Builder::default()
        .load_env()
        .config_override("jwt_secret", secrets.get("JWT_SECRET").unwrap())
        .database(pool.into())
        .build()
        .await
        .unwrap();

    Ok(app.into())
}
