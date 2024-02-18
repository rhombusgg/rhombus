#[shuttle_runtime::main]
async fn main(#[shuttle_shared_db::Postgres] pool: sqlx::PgPool) -> shuttle_axum::ShuttleAxum {
    let app = rhombus::Rhombus::new(pool).build().await;

    Ok(app.into())
}
