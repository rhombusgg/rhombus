use std::{fmt::Write, sync::Arc, task::Poll};

use axum::{
    body::Body,
    extract::{Request, State},
    response::IntoResponse,
    Extension,
};
use pin_project::pin_project;
use reqwest::StatusCode;
use tokio::io::AsyncRead;
use tower_http::services::ServeFile;

use crate::{
    internal::{auth::MaybeUser, upload_provider::validate_simple_filename},
    LocalUploadProvider,
};

pub type LocalUploadProviderState = Arc<LocalUploadProvider>;

pub async fn route_local_download(
    state: State<LocalUploadProviderState>,
    Extension(maybe_user): Extension<MaybeUser>,
    axum::extract::Path(path): axum::extract::Path<String>,
    req: Request<Body>,
) -> impl IntoResponse {
    if !validate_simple_filename(&path) {
        return (StatusCode::BAD_REQUEST, "Invalid path".to_owned()).into_response();
    }

    let (_, filename) = if let Some(parts) = path.split_once('-') {
        parts
    } else {
        return (StatusCode::BAD_REQUEST, "Invalid path".to_owned()).into_response();
    };

    let filepath = std::path::Path::new(&state.base_path).join(&path);

    let filepath = match filepath.canonicalize() {
        Ok(path) => path,
        Err(_) => {
            return (StatusCode::NOT_FOUND, "Not Found").into_response();
        }
    };

    tracing::info!(
        path = filepath.to_str().unwrap(),
        user_id = maybe_user.map(|u| u.id),
        "Downloading from local file"
    );

    let mut response = ServeFile::new(&filepath).try_call(req).await.unwrap();
    response.headers_mut().insert(
        "Content-Disposition",
        format!("attachment; filename={}", &filename)
            .parse()
            .unwrap(),
    );
    response.into_response()
}

pub fn slice_to_hex_string(slice: &[u8]) -> String {
    slice.iter().fold(String::new(), |mut output, b| {
        let _ = write!(output, "{b:02x}");
        output
    })
}

#[pin_project]
pub struct HashRead<T> {
    #[pin]
    read: T,

    hasher: ring::digest::Context,
}

impl<T> HashRead<T> {
    pub fn new(read: T) -> Self {
        Self {
            read,
            hasher: ring::digest::Context::new(&ring::digest::SHA256),
        }
    }

    pub fn hash(self) -> Vec<u8> {
        self.hasher.finish().as_ref().into()
    }
}

impl<T> AsyncRead for HashRead<T>
where
    T: AsyncRead,
{
    fn poll_read(
        self: std::pin::Pin<&mut Self>,
        cx: &mut std::task::Context<'_>,
        buf: &mut tokio::io::ReadBuf<'_>,
    ) -> std::task::Poll<std::io::Result<()>> {
        let this = self.project();
        let before_len = buf.filled().len();

        match this.read.poll_read(cx, buf) {
            Poll::Pending => Poll::Pending,
            Poll::Ready(Err(e)) => Poll::Ready(Err(e)),
            Poll::Ready(Ok(())) => {
                let filled = buf.filled();
                let after_len = filled.len();

                if after_len > before_len {
                    let new = &filled[before_len..];
                    this.hasher.update(new);
                }

                Poll::Ready(Ok(()))
            }
        }
    }
}
