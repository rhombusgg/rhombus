#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .event_format(
            tracing_subscriber::fmt::format()
                .with_file(true)
                .with_line_number(true),
        )
        .with_max_level(tracing::Level::TRACE)
        .init();

    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(5)
        .connect("postgres://postgres:password@localhost")
        .await
        .unwrap();

    let app = rhombus::Rhombus::new(pool)
        .await
        .plugin(plugin::MyPlugin::new(11))
        .await
        .build();

    rhombus::serve(app, "127.0.0.1:3000").await.unwrap();
}
