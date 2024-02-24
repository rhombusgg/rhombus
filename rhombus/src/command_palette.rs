use axum::{extract::State, response::Html};

use crate::RhombusRouterState;

pub async fn route_command_palette(State(state): State<RhombusRouterState>) -> Html<String> {
    let context = tera::Context::new();
    Html(state.tera.render("command-palette.html", &context).unwrap())
}
