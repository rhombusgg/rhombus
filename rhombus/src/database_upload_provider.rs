use std::{io, sync::Arc};

use axum::{
    body::{Body, Bytes},
    extract::State,
    http::Response,
    response::IntoResponse,
    routing::{get, post},
    Extension, Router,
};
use futures::{Stream, TryStreamExt};
use reqwest::StatusCode;
use tokio::io::AsyncReadExt;
use tokio_util::{bytes::BytesMut, io::StreamReader};

use crate::{
    internal::{
        auth::MaybeUser,
        database::provider::Connection,
        local_upload_provider::slice_to_hex_string,
        upload_provider::{route_upload_file, validate_simple_filename},
    },
    upload_provider::UploadProvider,
    Result,
};

#[derive(Clone)]
pub struct DatabaseUploadProvider {
    pub db: Connection,
}

impl DatabaseUploadProvider {
    pub async fn new(db: Connection) -> DatabaseUploadProvider {
        DatabaseUploadProvider { db }
    }
}

#[async_trait::async_trait]
impl UploadProvider for DatabaseUploadProvider {
    fn routes(&self) -> Result<Router> {
        let provider_state = Arc::new(self.clone());
        let router = Router::new()
            .route("/uploads/:hash_filename", get(route_database_download))
            .route("/upload/:path", post(route_upload_file::<Self>))
            .with_state(provider_state);
        Ok(router)
    }

    async fn upload<S, E>(&self, filename: &str, stream: S) -> Result<String>
    where
        S: Stream<Item = std::result::Result<Bytes, E>> + Send + 'async_trait,
        E: Into<axum::BoxError>,
    {
        let body_with_io_error = stream.map_err(|err| io::Error::other(err));
        let body_reader = StreamReader::new(body_with_io_error);

        futures::pin_mut!(body_reader);

        let mut buffer = BytesMut::new();
        while let Ok(bytes_read) = body_reader.read_buf(&mut buffer).await {
            if bytes_read == 0 {
                break;
            }
        }

        let digest = ring::digest::digest(&ring::digest::SHA256, &buffer);
        let hash = slice_to_hex_string(digest.as_ref());

        self.db.upload_file(&hash, filename, &buffer).await?;

        let url = format!("/uploads/{hash}-{filename}");

        tracing::info!(url, "uploaded to database");

        Ok(url)
    }
}

pub async fn route_database_download(
    state: State<Arc<DatabaseUploadProvider>>,
    Extension(maybe_user): Extension<MaybeUser>,
    axum::extract::Path(path): axum::extract::Path<String>,
) -> impl IntoResponse {
    if !validate_simple_filename(&path) {
        return (StatusCode::BAD_REQUEST, "Invalid path".to_owned()).into_response();
    }

    let (hash, filename) = if let Some(parts) = path.split_once('-') {
        parts
    } else {
        return (StatusCode::BAD_REQUEST, "Invalid path".to_owned()).into_response();
    };

    let (contents, db_filename) = state.db.download_file(hash).await.unwrap();

    if filename != db_filename {
        return (StatusCode::NOT_FOUND, "Not Found").into_response();
    }

    tracing::info!(
        path = filename,
        user_id = maybe_user.map(|u| u.id),
        "Downloading from database"
    );

    let body = Body::from(contents);
    let mut response = Response::new(body);
    response.headers_mut().insert(
        "Content-Disposition",
        format!("attachment; filename={}", &filename)
            .parse()
            .unwrap(),
    );
    response.into_response()
}
