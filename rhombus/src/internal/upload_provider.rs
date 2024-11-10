use std::sync::Arc;

use axum::{
    extract::{Path, Request, State},
    response::IntoResponse,
    Extension,
};
use reqwest::StatusCode;

use crate::{internal::auth::MaybeUser, UploadProvider};

pub async fn route_upload_file<U: UploadProvider>(
    State(upload_provider): State<Arc<U>>,
    Extension(user): Extension<MaybeUser>,
    Path(file_name): Path<String>,
    request: Request,
) -> impl IntoResponse {
    let Some(user) = user else {
        return (StatusCode::UNAUTHORIZED, "Unauthorized".to_owned()).into_response();
    };

    if !user.is_admin {
        return (StatusCode::FORBIDDEN, "Forbidden".to_owned()).into_response();
    }

    if !validate_simple_filename(&file_name) {
        return (StatusCode::BAD_REQUEST, "Invalid path".to_owned()).into_response();
    }

    upload_provider
        .upload(&file_name, request.into_body().into_data_stream())
        .await
        .unwrap()
        .into_response()
}

// we should only upload files that are made up of a single normal component
pub fn validate_simple_filename(path: &str) -> bool {
    let path = std::path::Path::new(path);
    let mut components = path.components().peekable();

    if let Some(first) = components.peek() {
        if !matches!(first, std::path::Component::Normal(_)) {
            return false;
        }
    }

    components.count() == 1
}
