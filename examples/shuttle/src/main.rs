#[shuttle_runtime::main]
async fn main(
    #[shuttle_shared_db::Postgres] pool: sqlx::PgPool,
    #[shuttle_runtime::Secrets] secrets: shuttle_runtime::SecretStore,
) -> shuttle_axum::ShuttleAxum {
    let app = rhombus::Builder::default()
        .config_from_shuttle(secrets.into_iter())
        .database(pool.into())
        .build()
        .await
        .unwrap();

    Ok(app.into())
}
