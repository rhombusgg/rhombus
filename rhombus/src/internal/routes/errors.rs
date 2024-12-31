use std::any::Any;

use axum::{
    extract::State,
    http::Response,
    response::{Html, IntoResponse},
    Extension,
};
use minijinja::context;
use reqwest::{header, StatusCode};

use crate::internal::{auth::User, router::RouterState, routes::meta::PageMeta};

pub fn handle_panic(err: Box<dyn Any + Send + 'static>) -> Response<String> {
    let details = if let Some(s) = err.downcast_ref::<String>() {
        s.clone()
    } else if let Some(s) = err.downcast_ref::<&str>() {
        s.to_string()
    } else {
        "Unknown panic message".to_string()
    };

    let body = serde_json::json!({
        "error": {
            "kind": "panic",
            "details": details,
        }
    });
    let body = serde_json::to_string(&body).unwrap();

    Response::builder()
        .status(StatusCode::INTERNAL_SERVER_ERROR)
        .header(header::CONTENT_TYPE, "application/json")
        .body(body)
        .unwrap()
}

pub async fn route_not_found(
    state: State<RouterState>,
    Extension(user): Extension<User>,
    Extension(page): Extension<PageMeta>,
) -> impl IntoResponse {
    let html = state
        .jinja
        .get_template("error.html")
        .unwrap()
        .render(context! {
            global => state.global_page_meta,
            page,
            user,
            title => "Page Not Found",
            error_code => "404 Not Found",
            error_description => "The page you are looking for does not exist.",
        })
        .unwrap();

    (StatusCode::NOT_FOUND, Html(html))
}
