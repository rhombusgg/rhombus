use std::{io, str::FromStr, sync::Arc};

use async_hash::{Digest, Sha256};
use axum::{body::Bytes, routing::post, Router};
use futures::{Stream, TryStreamExt};

use s3::{creds::Credentials, Bucket};
use tokio::io::AsyncReadExt;
use tokio_util::{bytes::BytesMut, io::StreamReader};

use crate::{
    internal::{
        local_upload_provider::slice_to_hex_string, settings::S3UploadProviderSettings,
        upload_provider::route_upload_file,
    },
    upload_provider::UploadProvider,
    Result,
};

#[derive(Clone)]
pub struct S3UploadProvider {
    pub bucket: Box<Bucket>,
    pub presigned_get_expiry: Option<u32>,
    pub prefix: String,
}

impl S3UploadProvider {
    pub async fn new(s3: &S3UploadProviderSettings) -> Result<S3UploadProvider> {
        let credentials = Credentials::new(
            s3.access_key.as_deref(),
            s3.secret_key.as_deref(),
            s3.security_token.as_deref(),
            s3.session_token.as_deref(),
            s3.profile.as_deref(),
        )?;
        let region = if let Some(endpoint) = &s3.endpoint {
            s3::Region::Custom {
                region: s3
                    .bucket_region
                    .as_ref()
                    .cloned()
                    .unwrap_or("us-east-1".to_owned()),
                endpoint: endpoint.clone(),
            }
        } else {
            s3::Region::from_str(s3.bucket_region.as_deref().unwrap_or("us-east-1")).unwrap()
        };

        let bucket = Bucket::new(&s3.bucket_name, region, credentials)?;

        let bucket = if s3.path_style.unwrap_or(false) {
            bucket.with_path_style()
        } else {
            bucket
        };

        let exists = bucket.exists().await?;
        if !exists {
            tracing::error!("configured bucket does not exist");
        }

        Ok(S3UploadProvider {
            bucket,
            presigned_get_expiry: s3.presigned_get_expiry,
            prefix: s3.prefix.clone().unwrap_or("".to_owned()),
        })
    }
}

impl UploadProvider for S3UploadProvider {
    fn routes(&self) -> Result<Router> {
        let provider_state = Arc::new(self.clone());
        let router = Router::new()
            .route("/upload/:path", post(route_upload_file::<Self>))
            .with_state(provider_state);
        Ok(router)
    }

    async fn upload<S, E>(&self, filename: &str, stream: S) -> Result<String>
    where
        S: Stream<Item = std::result::Result<Bytes, E>> + Send,
        E: Into<axum::BoxError>,
    {
        let body_with_io_error = stream.map_err(|err| io::Error::new(io::ErrorKind::Other, err));
        let body_reader = StreamReader::new(body_with_io_error);

        futures::pin_mut!(body_reader);

        let mut buffer = BytesMut::new();
        while let Ok(bytes_read) = body_reader.read_buf(&mut buffer).await {
            if bytes_read == 0 {
                break;
            }
        }

        let mut hasher = Sha256::new();
        hasher.update(&buffer);
        let hash = slice_to_hex_string(hasher.finalize().as_slice());

        let s3_path = format!("{}{}/{}", self.prefix, hash, filename);

        _ = self.bucket.put_object(&s3_path, &buffer).await?;

        let url = if let Some(presigned_get_expiry) = self.presigned_get_expiry {
            self.bucket
                .presign_get(&s3_path, presigned_get_expiry, None)
                .await?
        } else {
            format!("{}/{}", self.bucket.url(), &s3_path)
        };

        tracing::info!(url, "uploaded to s3");

        Ok(url)
    }
}
