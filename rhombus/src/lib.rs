use askama::Template;
use axum::{
    http::StatusCode,
    response::{Html, IntoResponse},
    routing::get,
    Router,
};
use challenges::{route_challenges, ChallengeRenderFn};
use maud::{html, Render, DOCTYPE};
use plugin::Plugin;
use sqlx::PgPool;
use tokio::net::{TcpListener, ToSocketAddrs};
use tower_http::services::ServeDir;
use tracing::info;

use crate::challenges::challenge_view;

pub mod challenges;
pub mod plugin;

pub trait TuplePlugins {
    fn next(&self) -> Option<&'_ (dyn Plugin + Sync)>;
}

impl TuplePlugins for () {
    fn next(&self) -> Option<&'_ (dyn Plugin + Sync)> {
        None
    }
}

impl<P: Plugin + Sync, T: TuplePlugins> TuplePlugins for (P, T) {
    fn next(&self) -> Option<&'_ (dyn Plugin + Sync)> {
        Some(&self.0)
    }
}

#[derive(Clone)]
pub struct Rhombus<P = ()>
where
    P: TuplePlugins,
{
    app_router: Router,
    plugin_router: Router,
    router_state: RhombusRouterState,
    plugins: P,
}

#[derive(Clone)]
pub struct RhombusRouterState {
    pub db: PgPool,
    pub views: Views,
}

#[derive(Clone)]
pub struct Views {
    pub challenges: ChallengeRenderFn,
}

async fn handler_404() -> impl IntoResponse {
    (StatusCode::NOT_FOUND, Html("404"))
}

pub fn page_layout(child: impl Render) -> impl Render {
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

#[derive(Template)]
#[template(path = "hello.html")]
pub struct HelloTemplate<'a> {
    name: &'a str,
}

pub async fn route_test() -> impl IntoResponse {
    let hello = HelloTemplate { name: "thanos" };
    Html(hello.render().unwrap())
}

static STATIC_DIR: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/static");

impl<P> Rhombus<P>
where
    P: TuplePlugins,
{
    pub async fn new(db: PgPool, plugins: P) -> Self {
        sqlx::migrate!().run(&db).await.unwrap();

        Self {
            router_state: RhombusRouterState {
                db,
                views: Views {
                    challenges: challenge_view,
                },
            },
            app_router: Router::new(),
            plugin_router: Router::new(),
            plugins,
        }
    }

    pub fn plugin<P2>(self, plugin: P2) -> Rhombus<(P2, P)>
    where
        P2: Plugin + Sync,
    {
        let plugin_router = plugin.routes(self.router_state.clone());

        Rhombus {
            router_state: self.router_state.clone(),
            app_router: self.app_router,
            plugin_router: self.plugin_router.merge(plugin_router),
            plugins: (plugin, self.plugins),
        }
    }

    pub async fn build(&self) -> Router {
        self.plugins
            .next()
            .unwrap()
            .migrate(self.router_state.db.clone())
            .await;

        let router = Router::new()
            .fallback_service(
                Router::new()
                    .fallback(handler_404)
                    .nest_service("/static", ServeDir::new(STATIC_DIR))
                    .route("/challenges", get(route_challenges))
                    .route("/test", get(route_test))
                    .with_state(self.router_state.clone()),
            )
            .nest("/", self.plugin_router.clone());

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
