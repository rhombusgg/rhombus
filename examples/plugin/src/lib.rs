use axum::{
    async_trait,
    extract::{FromRef, State},
    http::Uri,
    response::Html,
    routing, Extension, Router,
};
use minijinja::{context, Environment};
use rhombus::{auth::MaybeClientUser, plugin::Plugin, RhombusRouterState};
use sqlx::{Executor, PgPool};

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
            .route("/", routing::get(route_home))
            .with_state(MyPluginRouterState {
                a: self.state.a,
                rhombus: Some(state),
            })
    }

    fn theme(&self, jinja: &mut Environment<'static>) {
        jinja
            .add_template("home.html", include_str!("../templates/home.html"))
            .unwrap();
    }

    async fn migrate(&self, db: PgPool) {
        db.execute(include_str!("../migrations/standalone.sql"))
            .await
            .unwrap();
    }
}

async fn route_home(
    State(rhombus): State<RhombusRouterState>,
    State(plugin): State<MyPluginRouterState>,
    Extension(user): Extension<MaybeClientUser>,
    uri: Uri,
) -> Html<String> {
    Html(
        rhombus
            .jinja
            .get_template("home.html")
            .unwrap()
            .render(context! {
                user => user,
                uri => uri.to_string(),
                discord_signin_url => &rhombus.discord_signin_url,
                a => &plugin.a,
            })
            .unwrap(),
    )
}
