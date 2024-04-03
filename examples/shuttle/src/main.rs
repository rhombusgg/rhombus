#[shuttle_runtime::main]
async fn main(
    #[shuttle_shared_db::Postgres] pool: sqlx::PgPool,
    #[shuttle_secrets::Secrets] secrets: shuttle_secrets::SecretStore,
) -> shuttle_axum::ShuttleAxum {
    let app = rhombus::Builder::new()
        .load_env()
        .location_url("http://localhost:3001")
        .jwt_secret(secrets.get("JWT_SECRET").unwrap())
        .database(pool.into())
        .build()
        .await
        .unwrap();

    Ok(app.into())
}
