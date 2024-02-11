use axum::{
    extract::{FromRef, State},
    response::Html,
    routing, Router,
};
use rhombus::{plugin::Plugin, RhombusRouterState};

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

async fn route_c(
    State(state): State<MyPluginRouterState>,
    State(rhombus): State<RhombusRouterState>,
) -> Html<String> {
    Html(format!("<h1>plugin c {} {}</h1>", state.a, rhombus.my_val))
}

impl Plugin for MyPlugin {
    fn routes(&self, state: RhombusRouterState) -> Router {
        Router::new()
            .route("/c", routing::get(route_c))
            .with_state(MyPluginRouterState {
                a: self.state.a,
                rhombus: Some(state),
            })
    }

    fn migrate(&self) {
        tracing::info!("migrate plugin1");
    }
}
