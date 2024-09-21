use axum::{
    body::Body,
    extract::State,
    http::Request,
    response::{IntoResponse, Response},
    Extension,
};
use std::{
    convert::Infallible,
    future::Future,
    pin::Pin,
    sync::{atomic::AtomicPtr, Arc},
};
use tokio::sync::{Mutex, RwLock};
use tower::{make::Shared, Service, ServiceExt};

use crate::{
    internal::{
        database::provider::Connection, discord::Bot, division::Division,
        email::outbound_mailer::OutboundMailer, ip::IpExtractorFn, locales::Localizations,
        routes::meta::GlobalPageMeta, settings::Settings,
    },
    Plugin, UploadProvider,
};

pub type RouterState = Arc<RouterStateInner>;

pub struct RouterStateInner {
    pub db: Connection,
    pub bot: Option<Arc<Bot>>,
    pub jinja: Arc<minijinja::Environment<'static>>,
    pub localizer: Arc<Localizations>,
    pub settings: Arc<RwLock<Settings>>,
    pub ip_extractor: IpExtractorFn,
    pub outbound_mailer: Option<Arc<OutboundMailer>>,
    pub divisions: Arc<Vec<Division>>,
    pub router: Arc<Router>,
    pub global_page_meta: Arc<GlobalPageMeta>,
}

pub struct Router {
    pub service: Arc<AtomicPtr<axum::Router>>,
}

impl Default for Router {
    fn default() -> Self {
        Self::new()
    }
}

impl Router {
    pub fn new() -> Self {
        Self {
            service: Arc::new(AtomicPtr::new(Box::into_raw(Box::new(axum::Router::new())))),
        }
    }

    pub fn update(&self, router: axum::Router) {
        let old = self.service.swap(
            Box::into_raw(Box::new(router)),
            std::sync::atomic::Ordering::Relaxed,
        );
        unsafe {
            drop(Box::from_raw(old));
        };
    }

    pub async fn serve(&self, listener: tokio::net::TcpListener) {
        let router_ptr = self.service.clone();
        let service = tower::service_fn(move |req: axum::http::Request<axum::body::Body>| {
            let router = unsafe {
                router_ptr
                    .load(std::sync::atomic::Ordering::Relaxed)
                    .as_ref()
            }
            .unwrap()
            .clone();
            async { router.oneshot(req).await }
        });

        axum::serve(listener, Shared::new(service)).await.unwrap();
    }

    pub fn service(
        &self,
    ) -> impl Service<
        Request<Body>,
        Response = Response,
        Error = Infallible,
        Future = Pin<Box<dyn Future<Output = Result<Response, Infallible>> + Send>>,
    > + Clone
           + Send
           + 'static {
        let router_ptr = self.service.clone();
        tower::service_fn(move |req: Request<Body>| {
            let router_ptr = router_ptr.clone();
            Box::pin(async move {
                let router = unsafe {
                    router_ptr
                        .load(std::sync::atomic::Ordering::Relaxed)
                        .as_ref()
                }
                .unwrap()
                .clone();
                Ok(router.oneshot(req).await.unwrap_or_else(|_| {
                    Response::builder()
                        .status(500)
                        .body(Body::from("Internal server error"))
                        .unwrap()
                }))
            }) as Pin<Box<dyn Future<Output = Result<Response, Infallible>> + Send>>
        })
    }
}

pub fn rebuild_router<
    P: Plugin + Send + Sync + 'static,
    U: UploadProvider + Send + Sync + 'static,
>(
    builder: crate::Builder<P, U>,
    rr: Arc<crate::internal::router::Router>,
) {
    let rt = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap();

    std::thread::spawn(move || {
        let local = tokio::task::LocalSet::new();

        local.spawn_local(async move {
            tokio::task::spawn_local(async move {
                let router = builder.build_axum_router(rr.clone()).await.unwrap();
                rr.update(router);
            })
            .await
            .unwrap();
        });

        rt.block_on(local);
    });
}

pub type BuilderExtension<P, U> = Extension<Arc<Mutex<Option<crate::Builder<P, U>>>>>;

pub async fn route_reload<
    P: Plugin + Send + Sync + 'static,
    U: UploadProvider + Send + Sync + 'static,
>(
    state: State<RouterState>,
    Extension(builder): BuilderExtension<P, U>,
) -> impl IntoResponse {
    if let Some(builder) = builder.lock().await.take() {
        let builder = builder.config_override("auth", vec!["discord"]);
        rebuild_router(builder, state.router.clone());
    }
}
