use axum::{
    body::Body,
    extract::Request,
    http::{HeaderValue, Uri},
    response::IntoResponse,
};
use reqwest::StatusCode;
use rust_embed::RustEmbed;
use tower::ServiceExt;
use tower_http::services::ServeDir;

use crate::internal::upload_provider::path_is_valid;

#[derive(RustEmbed)]
#[folder = "static"]
struct StaticDir;

pub async fn route_static_serve(uri: Uri, req: Request<Body>) -> impl IntoResponse {
    let file = uri.path().trim_start_matches("/");

    if !path_is_valid(file) {
        return (StatusCode::BAD_REQUEST, "Invalid path".to_owned()).into_response();
    }

    let service = ServeDir::new("static");
    if let Ok(response) = service.oneshot(req).await {
        if response.status().is_informational()
            || response.status().is_success()
            || response.status().is_redirection()
        {
            return response.into_response();
        }
    }

    if let Some(content) = StaticDir::get(file) {
        let guess = mime_guess::from_path(file);
        let mime = guess
            .first_raw()
            .map(HeaderValue::from_static)
            .unwrap_or_else(|| {
                HeaderValue::from_str(mime_guess::mime::APPLICATION_OCTET_STREAM.as_ref()).unwrap()
            });

        let mut response = content.data.into_response();
        response.headers_mut().insert("Content-Type", mime);

        #[cfg(not(debug_assertions))]
        response.headers_mut().insert(
            "Cache-Control",
            HeaderValue::from_static("public, max-age=604800"),
        );

        return response.into_response();
    }

    (StatusCode::NOT_FOUND, "Not Found").into_response()
}
