use axum::{body::Bytes, Router};
use futures::{Stream, StreamExt};
use std::pin::Pin;

use crate::Result;

#[async_trait::async_trait]
pub trait ErasedUploadProvider: Send + Sync {
    #[allow(clippy::result_large_err)]
    fn routes(&self) -> Result<Router>;

    async fn upload_erased(
        &self,
        filename: &str,
        stream: Pin<
            Box<
                dyn Stream<
                        Item = std::result::Result<Bytes, Box<dyn std::error::Error + Send + Sync>>,
                    > + Send
                    + 'async_trait,
            >,
        >,
    ) -> Result<String>;
}

#[async_trait::async_trait]
pub trait UploadProvider: Send + Sync {
    #[allow(clippy::result_large_err)]
    fn routes(&self) -> Result<Router>;

    async fn upload<S, E>(&self, filename: &str, stream: S) -> Result<String>
    where
        S: Stream<Item = std::result::Result<Bytes, E>> + Send + 'async_trait,
        E: Into<axum::BoxError>;
}

#[async_trait::async_trait]
impl UploadProvider for dyn ErasedUploadProvider {
    fn routes(&self) -> Result<Router> {
        self.routes()
    }

    async fn upload<S, E>(&self, filename: &str, stream: S) -> Result<String>
    where
        S: Stream<Item = std::result::Result<Bytes, E>> + Send + 'async_trait,
        E: Into<axum::BoxError>,
    {
        let mapped_stream = stream.map(|result| result.map_err(|e| e.into()));
        let boxed_stream = Box::pin(mapped_stream);

        self.upload_erased(filename, boxed_stream).await
    }
}

#[async_trait::async_trait]
impl<T> ErasedUploadProvider for T
where
    T: UploadProvider + Send + Sync,
{
    fn routes(&self) -> Result<Router> {
        self.routes()
    }

    async fn upload_erased(
        &self,
        filename: &str,
        stream: Pin<
            Box<
                dyn Stream<
                        Item = std::result::Result<Bytes, Box<dyn std::error::Error + Send + Sync>>,
                    > + Send
                    + 'async_trait,
            >,
        >,
    ) -> Result<String> {
        self.upload(filename, stream).await
    }
}
