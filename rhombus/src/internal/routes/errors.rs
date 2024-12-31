use std::any::Any;

use axum::{
    body::Body,
    extract::{Request, State},
    http::{Response, Uri},
    middleware::Next,
    response::{Html, IntoResponse},
    Extension, Json,
};
use minijinja::context;
use reqwest::{header, StatusCode};

use crate::internal::{
    auth::{MaybeUser, User},
    router::RouterState,
    routes::meta::PageMeta,
};

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
    State(state): State<RouterState>,
    Extension(user): Extension<MaybeUser>,
    Extension(page): Extension<PageMeta>,
    uri: Uri,
) -> impl IntoResponse {
    let user_id = user.as_ref().map(|user| user.id);
    tracing::error!(user_id, uri = uri.to_string(), "Page not found");
    error_page(
        StatusCode::NOT_FOUND,
        "Page not found",
        &state,
        &user,
        &page,
    )
}

#[inline]
pub fn error_page(
    status_code: StatusCode,
    description: &'static str,
    state: &RouterState,
    user: &Option<User>,
    page: &PageMeta,
) -> axum::response::Response {
    let html = state
        .jinja
        .get_template("error.html")
        .unwrap()
        .render(context! {
            global => state.global_page_meta,
            page,
            user,
            title => format!("Error: {} | {}", description, state.global_page_meta.title),
            error_code => status_code.to_string(),
            error_description => description,
        })
        .unwrap();

    (status_code, Html(html)).into_response()
}

pub async fn error_handler_middleware(
    State(state): State<RouterState>,
    mut req: Request<Body>,
    next: Next,
) -> axum::response::Response {
    req.extensions_mut().insert(state);
    next.run(req).await
}

pub trait IntoErrorResponse<T> {
    fn map_err_page_code(
        self,
        req: &Request<Body>,
        status_code: StatusCode,
        description: &'static str,
    ) -> Result<T, axum::response::Response>;

    #[track_caller]
    #[inline]
    fn map_err_page(
        self,
        req: &Request<Body>,
        description: &'static str,
    ) -> Result<T, axum::response::Response>
    where
        Self: Sized,
    {
        self.map_err_page_code(req, StatusCode::INTERNAL_SERVER_ERROR, description)
    }
}

impl<T, E: std::error::Error + 'static> IntoErrorResponse<T> for Result<T, E> {
    #[track_caller]
    #[inline]
    fn map_err_page_code(
        self,
        req: &Request<Body>,
        status_code: StatusCode,
        description: &'static str,
    ) -> Result<T, axum::response::Response> {
        let caller = std::panic::Location::caller();

        self.map_err(|e| {
            if let (Some(state), Some(user), Some(page)) = (
                req.extensions().get::<RouterState>(),
                req.extensions().get::<MaybeUser>(),
                req.extensions().get::<PageMeta>(),
            ) {
                let user_id = user.as_ref().map(|user| user.id);
                let location = format!("{}:{}:{}", caller.file(), caller.line(), caller.column());
                tracing::error!(location, user_id, error = ?e, description, "Error");

                error_page(status_code, description, &state, &user, &page).into_response()
            } else {
                (
                    status_code,
                    Json(serde_json::json!({
                        "error": {
                            "kind": "caught",
                            "details": description,
                        }
                    })),
                )
                    .into_response()
            }
        })
    }
}
