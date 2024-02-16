use maud::html;

use axum::{
    async_trait,
    extract::{FromRef, State},
    response::Html,
    routing, Router,
};
use rhombus::{challenges::ChallengeModel, plugin::Plugin, RhombusRouterState};
use sqlx::{Executor, PgPool};
use tracing::info;

#[derive(Clone)]
pub struct MyPlugin {
    state: MyPluginRouterState,
}

#[derive(Clone)]
struct MyPluginRouterState {
    a: i32,
    rhombus: Option<RhombusRouterState>,
}

impl FromRef<MyPluginRouterState> for RhombusRouterState {
    fn from_ref(plugin_state: &MyPluginRouterState) -> RhombusRouterState {
        plugin_state.rhombus.clone().unwrap()
    }
}

impl MyPlugin {
    pub fn new(a: i32) -> Self {
        Self {
            state: MyPluginRouterState { a, rhombus: None },
        }
    }
}

#[async_trait]
impl Plugin for MyPlugin {
    fn routes(&self, state: RhombusRouterState) -> Router {
        Router::new()
            .route("/challenges", routing::get(route_plugin_challenges))
            .with_state(MyPluginRouterState {
                a: self.state.a,
                rhombus: Some(state),
            })
    }

    async fn migrate(&self, db: PgPool) {
        info!("migrating");
        db.execute(include_str!("../migrations/standalone.sql"))
            .await
            .unwrap();
    }
}

async fn route_plugin_challenges(
    State(state): State<MyPluginRouterState>,
    State(rhombus): State<RhombusRouterState>,
) -> Html<String> {
    let model = ChallengeModel::new(rhombus.db).await;

    Html("a".to_string())
}
