use async_trait::async_trait;
use axum::{body::Bytes, Router};
use futures::Stream;

use crate::{internal::router::RouterState, Result};

#[async_trait]
pub trait UploadProvider {
    fn build(&self, rhombus_state: RouterState) -> Self;
    fn routes(&self) -> Result<Router>;
    async fn upload<S, E>(&self, filename: &str, stream: S) -> Result<String>
    where
        S: Stream<Item = std::result::Result<Bytes, E>> + Send,
        E: Into<axum::BoxError>;
    async fn get_url(&self, filename: &str, hash: &str) -> Result<String>;
}
