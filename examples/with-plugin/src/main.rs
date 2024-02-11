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

    rhombus::Rhombus::new()
        .plugin(plugin::MyPlugin::new(11))
        .serve("127.0.0.1:3000")
        .await
        .unwrap();
}
