use axum::{extract::State, response::Html};
use minijinja::context;

use crate::RouterState;

pub async fn route_command_palette(State(state): State<RouterState>) -> Html<String> {
    Html(
        state
            .jinja
            .get_template("command-palette.html")
            .unwrap()
            .render(context! {})
            .unwrap(),
    )
}
