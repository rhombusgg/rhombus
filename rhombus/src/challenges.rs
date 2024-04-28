use axum::{
    extract::State,
    response::{Html, IntoResponse},
};
use minijinja::context;

use crate::RouterState;

pub async fn route_challenges(state: State<RouterState>) -> impl IntoResponse {
    let challenges = state.db.get_challenges().await.unwrap();

    Html(
        state
            .jinja
            .get_template("challenges.html")
            .unwrap()
            .render(context! {
                challenges => challenges,
            })
            .unwrap(),
    )
}
