use axum::{
    http::StatusCode,
    response::{Html, IntoResponse},
    routing::get,
    Router,
};
use challenges::route_challenges;
use listenfd::ListenFd;
use maud::{html, Markup, Render, DOCTYPE};
use plugin::Plugin;
use sqlx::PgPool;
use tokio::net::{TcpListener, ToSocketAddrs};
use tower_http::services::ServeDir;
use tracing::{debug, info};

pub mod challenges;
pub mod plugin;

pub struct Rhombus {
    app_router: Router,
    plugin_router: Router,
    router_state: RhombusRouterState,
}

#[derive(Clone)]
pub struct RhombusRouterState {
    pub db: PgPool,
}

async fn handler_404() -> impl IntoResponse {
    (StatusCode::NOT_FOUND, Html("404"))
}

pub fn page_layout(child: impl Render) -> Markup {
    html! {
        (DOCTYPE)
        html {
            head {
                title { "Rhombus" }
                script src="https://unpkg.com/htmx.org@1.9.10" {};
                link rel="stylesheet" type="text/css" href="/static/tailwind.css";
            }
            body {
                div class="flex flex-col justify-center items-center h-screen" {
                    (child)
                }
            }
        }
    }
}

static STATIC_DIR: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/static");

impl Rhombus {
    pub async fn new(db: PgPool) -> Self {
        sqlx::migrate!().run(&db).await.unwrap();

        Self {
            router_state: RhombusRouterState { db },
            app_router: Router::new(),
            plugin_router: Router::new(),
        }
    }

    pub async fn plugin(self, plugin: impl Plugin) -> Self {
        plugin.migrate(self.router_state.db.clone()).await;

        Rhombus {
            router_state: self.router_state.clone(),
            app_router: self.app_router,
            plugin_router: self
                .plugin_router
                .merge(plugin.routes(self.router_state.clone())),
        }
    }

    pub fn build(self) -> Router {
        let router = Router::new()
            .fallback_service(
                Router::new()
                    .fallback(handler_404)
                    .nest_service("/static", ServeDir::new(STATIC_DIR))
                    .route("/challenges", get(route_challenges))
                    .with_state(self.router_state.clone()),
            )
            .nest("/", self.plugin_router);

        #[cfg(debug_assertions)]
        let router = router.layer(tower_livereload::LiveReloadLayer::new());

        router
    }
}

pub async fn serve(router: Router, address: impl ToSocketAddrs) -> Result<(), std::io::Error> {
    #[cfg(debug_assertions)]
    let listener = match ListenFd::from_env().take_tcp_listener(0).unwrap() {
        Some(listener) => {
            debug!("restored socket from listenfd");
            listener.set_nonblocking(true).unwrap();
            TcpListener::from_std(listener).unwrap()
        }
        None => TcpListener::bind(address).await.unwrap(),
    };

    #[cfg(not(debug_assertions))]
    let listener = TcpListener::bind(address).await.unwrap();

    let address = listener.local_addr().unwrap().to_string();
    info!(address, "listening on {}", listener.local_addr().unwrap());
    axum::serve(listener, router).await?;

    Ok(())
}
