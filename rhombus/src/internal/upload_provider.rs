use std::sync::Arc;

use async_trait::async_trait;
use axum::{
    body::Bytes,
    extract::{Path, Request, State},
    response::IntoResponse,
    Router,
};
use futures::Stream;
use reqwest::StatusCode;

use crate::{Result, UploadProvider};

#[async_trait]
impl UploadProvider for () {
    fn routes(&self) -> Result<Router> {
        unreachable!()
    }

    async fn upload<S, E>(&self, _filename: &str, _stream: S) -> Result<String>
    where
        S: Stream<Item = std::result::Result<Bytes, E>> + Send,
        E: Into<axum::BoxError>,
    {
        unreachable!()
    }

    async fn get_url(&self, _filename: &str, _hash: &str) -> Result<String> {
        unreachable!()
    }
}

pub async fn route_upload_file<U: UploadProvider + Send + Sync>(
    State(upload_provider): State<Arc<U>>,
    Path(file_name): Path<String>,
    request: Request,
) -> impl IntoResponse {
    if !path_is_valid(&file_name) {
        return (StatusCode::BAD_REQUEST, "Invalid path".to_owned()).into_response();
    }

    upload_provider
        .upload(&file_name, request.into_body().into_data_stream())
        .await
        .unwrap()
        .into_response()
}

// to prevent directory traversal attacks we ensure the path consists of exactly one normal
// component
pub fn path_is_valid(path: &str) -> bool {
    let path = std::path::Path::new(path);
    let mut components = path.components().peekable();

    if let Some(first) = components.peek() {
        if !matches!(first, std::path::Component::Normal(_)) {
            return false;
        }
    }

    components.count() == 1
}
