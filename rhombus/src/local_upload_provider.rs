use std::{io, path::PathBuf, sync::Arc};

use axum::{
    body::Bytes,
    routing::{get, post},
    Router,
};
use futures::{Stream, TryStreamExt};
use rand::{
    distr::{Alphanumeric, SampleString},
    rng,
};
use tokio::{fs::File, io::BufWriter};
use tokio_util::io::StreamReader;

use crate::{
    errors::RhombusError,
    internal::{
        local_upload_provider::{route_local_download, slice_to_hex_string, HashRead},
        upload_provider::route_upload_file,
    },
    upload_provider::UploadProvider,
    Result,
};

#[derive(Clone)]
pub struct LocalUploadProvider {
    pub base_path: PathBuf,
}

impl LocalUploadProvider {
    pub fn new(base_filepath: PathBuf) -> LocalUploadProvider {
        LocalUploadProvider {
            base_path: base_filepath,
        }
    }
}

#[async_trait::async_trait]
impl UploadProvider for LocalUploadProvider {
    fn routes(&self) -> Result<Router> {
        let provider_state = Arc::new(self.clone());
        let router = Router::new()
            .route("/uploads/{hash_filename}", get(route_local_download))
            .route("/upload/{path}", post(route_upload_file::<Self>))
            .with_state(provider_state);
        Ok(router)
    }

    async fn upload<S, E>(&self, filename: &str, stream: S) -> Result<String>
    where
        S: Stream<Item = std::result::Result<Bytes, E>> + Send + 'async_trait,
        E: Into<axum::BoxError>,
    {
        async {
            let body_with_io_error = stream.map_err(|err| io::Error::other(err));
            let body_reader = StreamReader::new(body_with_io_error);
            futures::pin_mut!(body_reader);

            let mut src = HashRead::new(body_reader);

            let base_path = std::path::Path::new(&self.base_path);
            tokio::fs::create_dir_all(&base_path).await?;

            let temp_name = format!("{}.tmp", Alphanumeric.sample_string(&mut rng(), 60));
            let filepath = base_path.join(temp_name);
            let mut file = BufWriter::new(File::create(&filepath).await?);

            tokio::io::copy(&mut src, &mut file).await?;
            let hash = slice_to_hex_string(&src.hash());
            let new_filename = format!("{hash}-{filename}");

            let new_filepath = std::path::Path::new(&self.base_path).join(&new_filename);
            tokio::fs::rename(&filepath, &new_filepath).await?;

            Ok::<_, io::Error>(format!("/uploads/{}", &new_filename))
        }
        .await
        .map_err(|_| RhombusError::Unknown)
    }
}
