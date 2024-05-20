// use rust embed to create a route which serves static files underneath it

use axum::{extract::Path, http::HeaderValue, response::IntoResponse};
use reqwest::StatusCode;
use rust_embed::RustEmbed;

use super::upload_provider::path_is_valid;

#[derive(RustEmbed)]
#[folder = "static"]
struct StaticDir;

pub async fn route_static_serve(Path(file): Path<String>) -> impl IntoResponse {
    if !path_is_valid(&file) {
        return (StatusCode::BAD_REQUEST, "Invalid path".to_owned()).into_response();
    }

    if let Some(content) = StaticDir::get(&file) {
        let guess = mime_guess::from_path(&file);
        let mime = guess
            .first_raw()
            .map(HeaderValue::from_static)
            .unwrap_or_else(|| {
                HeaderValue::from_str(mime_guess::mime::APPLICATION_OCTET_STREAM.as_ref()).unwrap()
            });

        let mut response = content.data.into_response();
        response.headers_mut().insert("Content-Type", mime);
        response
    } else {
        (StatusCode::NOT_FOUND, "Not Found").into_response()
    }
}
