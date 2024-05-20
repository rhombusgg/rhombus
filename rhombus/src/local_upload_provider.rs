use std::{io, path::PathBuf, sync::Arc};

use async_trait::async_trait;
use axum::{body::Bytes, routing::get, Router};
use futures::{Stream, TryStreamExt};
use rand::{
    distributions::{Alphanumeric, DistString},
    thread_rng,
};
use tokio::{fs::File, io::BufWriter};
use tokio_util::io::StreamReader;

use crate::{
    errors::RhombusError,
    internal::{
        local_upload_provider::{route_local_download, vec_to_hex_string, HashRead},
        router::RouterState,
    },
    upload_provider::UploadProvider,
    Result,
};

#[derive(Clone)]
pub struct LocalUploadProvider {
    pub base_path: PathBuf,
    pub rhombus_state: Option<RouterState>,
}

impl LocalUploadProvider {
    pub fn new(base_filepath: PathBuf) -> LocalUploadProvider {
        LocalUploadProvider {
            base_path: base_filepath,
            rhombus_state: None,
        }
    }
}

#[async_trait]
impl UploadProvider for LocalUploadProvider {
    fn build(&self, rhombus_state: RouterState) -> Self {
        Self {
            base_path: self.base_path.clone(),
            rhombus_state: Some(rhombus_state),
        }
    }

    fn routes(&self) -> Result<Router> {
        let provider_state = Arc::new(self.clone());
        let router = Router::new()
            .route("/uploads/:hash_filename", get(route_local_download))
            .with_state(provider_state);
        Ok(router)
    }

    async fn upload<S, E>(&self, filename: &str, stream: S) -> Result<String>
    where
        S: Stream<Item = std::result::Result<Bytes, E>> + Send,
        E: Into<axum::BoxError>,
    {
        async {
            let body_with_io_error =
                stream.map_err(|err| io::Error::new(io::ErrorKind::Other, err));
            let body_reader = StreamReader::new(body_with_io_error);
            futures::pin_mut!(body_reader);

            let mut src = HashRead::new(body_reader);

            let base_path = std::path::Path::new(&self.base_path);
            tokio::fs::create_dir_all(&base_path).await?;

            let temp_name = format!("{}.tmp", Alphanumeric.sample_string(&mut thread_rng(), 60));
            let filepath = base_path.join(temp_name);
            let mut file = BufWriter::new(File::create(&filepath).await?);

            tokio::io::copy(&mut src, &mut file).await?;
            let hash = vec_to_hex_string(src.hash());
            let new_filename = format!("{}-{}", hash, filename);

            let new_filepath = std::path::Path::new(&self.base_path).join(&new_filename);
            tokio::fs::rename(&filepath, &new_filepath).await?;

            Ok::<_, io::Error>(format!(
                "{}/uploads/{}",
                self.rhombus_state
                    .as_ref()
                    .unwrap()
                    .settings
                    .read()
                    .await
                    .location_url,
                &new_filename
            ))
        }
        .await
        .map_err(|_| RhombusError::Unknown())
    }

    async fn get_url(&self, filename: &str, hash: &str) -> Result<String> {
        Ok(format!("/uploads/{}-{}", hash, filename))
    }
}
