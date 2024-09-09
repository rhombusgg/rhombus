use std::sync::Arc;

use axum::{
    body::Body, extract::Request, http::Uri, middleware::Next, response::IntoResponse, Extension,
};
use serde::Serialize;

use crate::internal::locales::Languages;

pub async fn route_robots_txt() -> impl IntoResponse {
    "User-agent: *\nDisallow: /admin\n"
}

#[derive(Serialize)]
pub struct GlobalPageMeta {
    pub title: String,
    pub description: String,
    pub location_url: String,
    pub organizer: Option<String>,
    pub generator: &'static str,
}

#[derive(Serialize)]
pub struct PageMetaInner {
    pub uri: String,
    pub lang: Languages,
}

pub type PageMeta = Arc<PageMetaInner>;

pub async fn page_meta_middleware(
    Extension(lang): Extension<Languages>,
    uri: Uri,
    mut req: Request<Body>,
    next: Next,
) -> impl IntoResponse {
    let page_meta = Arc::new(PageMetaInner {
        uri: uri.to_string(),
        lang,
    });

    req.extensions_mut().insert(page_meta);

    next.run(req).await
}
