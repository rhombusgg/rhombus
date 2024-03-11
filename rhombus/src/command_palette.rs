use axum::{extract::State, response::Html};
use minijinja::context;

use crate::RhombusRouterState;

pub async fn route_command_palette(State(state): State<RhombusRouterState>) -> Html<String> {
    Html(
        state
            .jinja
            .get_template("command-palette.html")
            .unwrap()
            .render(context! {})
            .unwrap(),
    )
}
