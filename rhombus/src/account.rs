use axum::{extract::State, http::Uri, response::Html, Extension};

use crate::{auth::User, RhombusRouterState};

pub async fn route_account(
    State(state): State<RhombusRouterState>,
    Extension(user): Extension<User>,
    uri: Uri,
) -> Html<String> {
    let mut context = tera::Context::new();
    context.insert("user", &user);
    context.insert("uri", &uri.to_string());
    Html(state.tera.render("account.html", &context).unwrap())
}
