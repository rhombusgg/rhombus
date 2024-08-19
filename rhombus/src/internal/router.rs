use std::sync::{atomic::AtomicPtr, Arc};
use tower::{make::Shared, ServiceExt};

use tokio::sync::RwLock;

use crate::internal::{
    database::provider::Connection, discord::Bot, division::Division,
    email::outbound_mailer::OutboundMailer, ip::IpExtractorFn, locales::Localizations,
    settings::Settings,
};

pub type RouterState = &'static RouterStateInner;

pub struct RouterStateInner {
    pub db: Connection,
    pub bot: Option<&'static Bot>,
    pub jinja: &'static minijinja::Environment<'static>,
    pub localizer: &'static Localizations,
    pub settings: &'static RwLock<Settings>,
    pub ip_extractor: IpExtractorFn,
    pub outbound_mailer: Option<&'static OutboundMailer>,
    pub divisions: &'static Vec<Division>,
    pub router: Arc<Router>,
}

pub struct Router {
    pub service: Arc<AtomicPtr<axum::Router>>,
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
}
