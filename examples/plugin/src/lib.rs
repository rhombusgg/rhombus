use axum::{
    async_trait,
    extract::{FromRef, State},
    http::Uri,
    response::Html,
    routing, Extension, Router,
};
use rhombus::{auth::MaybeClientUser, plugin::Plugin, RhombusRouterState};
use sqlx::{Executor, PgPool};
use tera::Tera;

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

static TEMPLATES_GLOB: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/templates/**/*.html");

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

    fn theme(&self, tera: &Tera) -> Tera {
        let mut plugin_tera = Tera::parse(TEMPLATES_GLOB).unwrap();
        plugin_tera.extend(&tera).unwrap();
        plugin_tera.build_inheritance_chains().unwrap();

        plugin_tera
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
    let mut context = tera::Context::new();
    context.insert("user", &user);
    context.insert("uri", &uri.to_string());
    context.insert("discord_signin_url", &rhombus.discord_signin_url);
    context.insert("a", &plugin.a);
    Html(rhombus.tera.render("home.html", &context).unwrap())
}
