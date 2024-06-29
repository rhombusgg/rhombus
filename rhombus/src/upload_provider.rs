use axum::{body::Bytes, Router};
use futures::Stream;

use crate::Result;

#[allow(async_fn_in_trait)]
pub trait UploadProvider {
    /// The router must implement a `POST` to `/upload/:path` route which will upload a file. In most cases,
    /// this can be achieved by using the [route_upload_file](crate::internal::upload_provider::route_upload_file) function.
    ///
    /// ```
    /// # use std::sync::Arc;
    /// # use axum::{Router, routing::post, body::Bytes};
    /// # use futures::Stream;
    /// # use rhombus::{UploadProvider, internal::upload_provider::route_upload_file};
    /// # #[derive(Clone)]
    /// # struct MyUploadProvider;
    /// # impl UploadProvider for MyUploadProvider {
    /// #     fn routes(&self) -> rhombus::Result<Router> {
    /// let provider_state = Arc::new(self.clone());
    /// let router = Router::new()
    ///     .route("/upload/:path", post(route_upload_file::<Self>))
    ///     .with_state(provider_state);
    /// Ok(router)
    /// # }
    /// # async fn upload<S, E>(&self, filename: &str, stream: S) -> rhombus::Result<String>
    /// # where
    /// #     S: Stream<Item = std::result::Result<Bytes, E>> + Send,
    /// #     E: Into<axum::BoxError> {
    /// #    Ok("".to_owned())
    /// }
    /// # async fn get_url(&self, filename: &str, hash: &str) -> rhombus::Result<String> {
    /// #     Ok("".to_owned())
    /// # }
    /// # }
    /// ```
    fn routes(&self) -> Result<Router>;

    /// Upload a file to the provider given a filename and a stream of bytes.
    async fn upload<S, E>(&self, filename: &str, stream: S) -> Result<String>
    where
        S: Stream<Item = std::result::Result<Bytes, E>> + Send,
        E: Into<axum::BoxError>;
}

pub enum EitherUploadProvider<L, R> {
    Left(L),
    Right(R),
}

impl<L, R> UploadProvider for EitherUploadProvider<L, R>
where
    L: UploadProvider + Send + Sync,
    R: UploadProvider + Send + Sync,
{
    fn routes(&self) -> Result<Router> {
        match self {
            EitherUploadProvider::Left(l) => l.routes(),
            EitherUploadProvider::Right(r) => r.routes(),
        }
    }
    async fn upload<S, E>(&self, filename: &str, stream: S) -> Result<String>
    where
        S: Stream<Item = std::result::Result<Bytes, E>> + Send,
        E: Into<axum::BoxError>,
    {
        match self {
            EitherUploadProvider::Left(l) => l.upload(filename, stream).await,
            EitherUploadProvider::Right(r) => r.upload(filename, stream).await,
        }
    }
}
