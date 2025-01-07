use std::any::Any;

use axum::{
    body::Body,
    extract::{Request, State},
    http::{Extensions, Response, Uri},
    middleware::Next,
    response::{Html, IntoResponse},
    BoxError, Extension, Json,
};
use minijinja::context;
use reqwest::{Method, StatusCode};

use crate::internal::{
    auth::{MaybeUser, User},
    router::RouterState,
    routes::meta::PageMeta,
};

#[inline]
pub fn htmx_error_status_code() -> StatusCode {
    StatusCode::from_u16(502).unwrap()
}

pub fn handle_panic(err: Box<dyn Any + Send + 'static>) -> Response<Body> {
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

    tracing::error!(details, "Panic");

    (StatusCode::INTERNAL_SERVER_ERROR, Json(body)).into_response()
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

pub fn timeout_inner(
    router_state: RouterState,
    Extension(user): Extension<MaybeUser>,
    Extension(page): Extension<PageMeta>,
    method: Method,
    uri: Uri,
    err: BoxError,
) -> impl IntoResponse {
    let user_id = user.as_ref().map(|user| user.id);
    tracing::error!(?method, ?uri, ?err, user_id, "Timeout");

    let (status_code, description) = if err.is::<tower::timeout::error::Elapsed>() {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            "Request timed out. Try again later.",
        )
    } else {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Unhandled internal error",
        )
    };

    let html = router_state
        .jinja
        .get_template("error.html")
        .unwrap()
        .render(context! {
            global => router_state.global_page_meta,
            page,
            user,
            title => format!("{} | {}", description, router_state.global_page_meta.title),
            error_code => status_code.to_string(),
            error_description => description,
        })
        .unwrap();

    (status_code, Html(html)).into_response()
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
            title => format!("{} | {}", description, state.global_page_meta.title),
            error_code => status_code.to_string(),
            error_description => description,
        })
        .unwrap();

    (status_code, Html(html)).into_response()
}

pub trait IntoErrorResponse<T> {
    fn map_err_page_code(
        self,
        extensions: &Extensions,
        status_code: StatusCode,
        description: &'static str,
    ) -> Result<T, axum::response::Response>;

    #[track_caller]
    #[inline]
    fn map_err_page(
        self,
        extensions: &Extensions,
        description: &'static str,
    ) -> Result<T, axum::response::Response>
    where
        Self: Sized,
    {
        self.map_err_page_code(extensions, StatusCode::INTERNAL_SERVER_ERROR, description)
    }

    fn map_err_htmx(
        self,
        extensions: &Extensions,
        description: &'static str,
    ) -> Result<T, axum::response::Response>;
}

impl<T, E: std::error::Error + 'static> IntoErrorResponse<T> for Result<T, E> {
    #[track_caller]
    #[inline]
    fn map_err_page_code(
        self,
        extensions: &Extensions,
        status_code: StatusCode,
        description: &'static str,
    ) -> Result<T, axum::response::Response> {
        let caller = std::panic::Location::caller();

        self.map_err(|e| {
            let user = match extensions.get::<MaybeUser>() {
                Some(user) => user,
                None => &None,
            };
            let user_id = user.as_ref().map(|user| user.id);
            let location = format!("{}:{}:{}", caller.file(), caller.line(), caller.column());
            tracing::error!(location, user_id, error = ?e, description, "Error");

            if let (Some(state), Some(page)) = (
                extensions.get::<RouterState>(),
                extensions.get::<PageMeta>(),
            ) {
                error_page(status_code, description, state, user, page).into_response()
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

    #[track_caller]
    #[inline]
    fn map_err_htmx(
        self,
        extensions: &Extensions,
        description: &'static str,
    ) -> Result<T, axum::response::Response> {
        let caller = std::panic::Location::caller();

        self.map_err(|e| {
            let user = match extensions.get::<MaybeUser>() {
                Some(user) => user,
                None => &None,
            };
            let user_id = user.as_ref().map(|user| user.id);
            let location = format!("{}:{}:{}", caller.file(), caller.line(), caller.column());
            tracing::error!(location, user_id, error = ?e, description, "Error");

            (htmx_error_status_code(), description).into_response()
        })
    }
}

impl<T> IntoErrorResponse<T> for Option<T> {
    #[track_caller]
    #[inline]
    fn map_err_page_code(
        self,
        extensions: &Extensions,
        status_code: StatusCode,
        description: &'static str,
    ) -> Result<T, axum::response::Response> {
        let caller = std::panic::Location::caller();

        self.ok_or_else(|| {
            let user = match extensions.get::<MaybeUser>() {
                Some(user) => user,
                None => &None,
            };
            let user_id = user.as_ref().map(|user| user.id);
            let location = format!("{}:{}:{}", caller.file(), caller.line(), caller.column());
            tracing::error!(location, user_id, description, "Error unwrapping Option");

            if let (Some(state), Some(page)) = (
                extensions.get::<RouterState>(),
                extensions.get::<PageMeta>(),
            ) {
                error_page(status_code, description, state, user, page).into_response()
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

    #[track_caller]
    #[inline]
    fn map_err_htmx(
        self,
        extensions: &Extensions,
        description: &'static str,
    ) -> Result<T, axum::response::Response> {
        let caller = std::panic::Location::caller();

        self.ok_or_else(|| {
            let user = match extensions.get::<MaybeUser>() {
                Some(user) => user,
                None => &None,
            };
            let user_id = user.as_ref().map(|user| user.id);
            let location = format!("{}:{}:{}", caller.file(), caller.line(), caller.column());
            tracing::error!(location, user_id, description, "Error unwrapping Option");

            (htmx_error_status_code(), description).into_response()
        })
    }
}

pub async fn error_handler_middleware(
    State(state): State<RouterState>,
    mut req: Request<Body>,
    next: Next,
) -> axum::response::Response {
    req.extensions_mut().insert(state);
    next.run(req).await
}

#[macro_export]
macro_rules! error_page_code {
    ($extensions:expr, $status_code:expr, $description:expr) => {{
        $crate::error_page_code!($extensions, $status_code, $description,)
    }};

    ($extensions:expr, $status_code:expr, $description:expr, $($key:ident = $value:expr),* $(,)?) => {{
        let caller = std::panic::Location::caller();

        let user = match $extensions.get::<MaybeUser>() {
            Some(user) => user,
            None => &None,
        };
        let user_id = user.as_ref().map(|user| user.id);
        let location = std::format!("{}:{}:{}", caller.file(), caller.line(), caller.column());

        tracing::error!(
            location,
            user_id,
            description = $description,
            $($key = $value,)*
            "Error"
        );

        if let (Some(state), Some(page)) = (
            $extensions.get::<RouterState>(),
            $extensions.get::<PageMeta>(),
        ) {
            $crate::internal::errors::error_page($status_code, $description, state, user, page).into_response()
        } else {
            (
                $status_code,
                Json(serde_json::json!({
                    "error": {
                        "kind": "caught",
                        "details": $description,
                    }
                })),
            )
                .into_response()
        }
    }};

    ($extensions:expr, $status_code:expr, $description:expr, $($field:ident),* $(,)?) => {{
        $crate::error_page_code!($extensions, $status_code, $description, $($field = $field),*)
    }};
}
