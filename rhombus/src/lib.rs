use axum::{
    http::StatusCode,
    response::{Html, IntoResponse},
    routing::get,
    Router,
};
use challenges::route_challenges;
use plugin::Plugin;
use sqlx::PgPool;
use tera::Tera;
use tokio::net::{TcpListener, ToSocketAddrs};
use tower_http::services::ServeDir;
use tracing::info;

pub mod challenges;
pub mod plugin;

pub struct Rhombus<'a> {
    db: PgPool,
    plugins: Vec<&'a (dyn Plugin + Sync)>,
}

#[derive(Clone)]
pub struct RhombusRouterState {
    pub db: PgPool,
    pub tera: Tera,
}

async fn handler_404() -> impl IntoResponse {
    (StatusCode::NOT_FOUND, Html("404"))
}

static STATIC_DIR: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/static");
static TEMPLATES_GLOB: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/templates/**/*.html");

impl<'a> Rhombus<'a> {
    pub fn new(db: PgPool) -> Self {
        Self {
            db,
            plugins: Vec::new(),
        }
    }

    pub fn plugin(self, plugin: &'a (impl Plugin + Sync)) -> Self {
        let mut plugins = self.plugins;
        plugins.push(plugin);

        Self {
            db: self.db,
            plugins,
        }
    }

    pub async fn build(&self) -> Router {
        sqlx::migrate!().run(&self.db).await.unwrap();

        for plugin in self.plugins.clone().iter() {
            plugin.migrate(self.db.clone()).await;
        }

        let mut tera = Tera::new(TEMPLATES_GLOB).unwrap();
        for plugin in self.plugins.iter() {
            tera = plugin.theme(&tera);
        }

        let router_state = RhombusRouterState {
            db: self.db.clone(),
            tera,
        };

        let mut plugin_router = Router::new();
        for plugin in self.plugins.iter() {
            plugin_router = plugin_router.merge(plugin.routes(router_state.clone()));
        }

        let router = Router::new()
            .fallback_service(
                Router::new()
                    .fallback(handler_404)
                    .nest_service("/static", ServeDir::new(STATIC_DIR))
                    .route("/challenges", get(route_challenges))
                    .with_state(router_state),
            )
            .nest("/", plugin_router);

        #[cfg(debug_assertions)]
        let router = router.layer(tower_livereload::LiveReloadLayer::new());

        router
    }
}

pub async fn serve(router: Router, address: impl ToSocketAddrs) -> Result<(), std::io::Error> {
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

    let address = listener.local_addr().unwrap().to_string();
    info!(address, "listening on {}", listener.local_addr().unwrap());
    axum::serve(listener, router).await?;

    Ok(())
}
