use axum::{
    http::StatusCode,
    response::{Html, IntoResponse},
    routing::get,
    Router,
};
use tokio::net::{TcpListener, ToSocketAddrs};

pub mod plugin;

pub struct Rhombus {
    app_router: Router,
    plugin_router: Router,
    router_state: RhombusRouterState,
}

#[derive(Clone)]
pub struct RhombusRouterState {
    pub my_val: i32,
}

impl Default for Rhombus {
    fn default() -> Self {
        Self::new()
    }
}

async fn handler_404() -> impl IntoResponse {
    (StatusCode::NOT_FOUND, Html("404"))
}

impl Rhombus {
    pub fn new() -> Self {
        let router_state = RhombusRouterState { my_val: 4 };
        Self {
            router_state: router_state.clone(),
            app_router: Router::new()
                .fallback(handler_404)
                .route("/a", get(|| async { Html("<h1>app1 a</h1>") }))
                .with_state(router_state.clone()),
            plugin_router: Router::new(),
        }
    }

    pub fn plugin(self, plugin: impl plugin::Plugin) -> Self {
        plugin.migrate();
        Rhombus {
            router_state: self.router_state.clone(),
            app_router: self.app_router,
            plugin_router: self
                .plugin_router
                .merge(plugin.routes(self.router_state.clone())),
        }
    }

    pub async fn serve(self, address: impl ToSocketAddrs) -> Result<(), std::io::Error> {
        let app = Router::new()
            .fallback_service(self.app_router)
            .nest("/", self.plugin_router);

        #[cfg(debug_assertions)]
        let listener = match listenfd::ListenFd::from_env().take_tcp_listener(0).unwrap() {
            Some(listener) => {
                tracing::debug!("restored socket from listenfd");
                listener.set_nonblocking(true).unwrap();
                TcpListener::from_std(listener).unwrap()
            }
            None => TcpListener::bind(address).await.unwrap(),
        };

        #[cfg(not(debug_assertions))]
        let listener = TcpListener::bind(address).await.unwrap();

        #[cfg(debug_assertions)]
        let app = app.layer(tower_livereload::LiveReloadLayer::new());

        let address = listener.local_addr().unwrap().to_string();
        tracing::info!(address, "listening on {}", listener.local_addr().unwrap());
        axum::serve(listener, app).await?;

        Ok(())
    }
}
