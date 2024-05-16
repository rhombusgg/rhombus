use axum::{
    extract::{FromRef, State},
    http::Uri,
    response::Html,
    routing, Extension, Router,
};
use fluent::FluentResource;
use minijinja::{context, Environment};
use rhombus::{
    internal::{
        auth::MaybeTokenClaims,
        backend_postgres::Postgres,
        locales::{Languages, Localizations},
        router::RouterState,
    },
    Plugin,
};
use sqlx::Executor;

#[derive(Clone)]
pub struct MyPlugin {
    state: MyPluginRouterState,
}

#[derive(Clone)]
struct MyPluginRouterState {
    a: i32,
    rhombus: Option<RouterState>,
}

impl FromRef<MyPluginRouterState> for RouterState {
    fn from_ref(plugin_state: &MyPluginRouterState) -> RouterState {
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

impl Plugin for MyPlugin {
    fn name(&self) -> String {
        "MyPlugin".to_owned()
    }

    fn theme(&self, jinja: &mut Environment<'static>) -> rhombus::Result<()> {
        jinja.add_template("home.html", include_str!("../templates/home.html"))?;
        Ok(())
    }

    fn routes(&self, state: RouterState) -> Router {
        Router::new()
            .route("/", routing::get(route_home))
            .with_state(MyPluginRouterState {
                a: self.state.a,
                rhombus: Some(state),
            })
    }

    fn localize(&self, localizations: &mut Localizations) -> rhombus::Result<()> {
        let res = FluentResource::try_new("test1 = Hello there\nho = Hol".to_string()).unwrap();
        let bundle = localizations.bundles.get_mut("en").unwrap();

        bundle.add_resource_overriding(res);
        Ok(())
    }

    async fn migrate_postgresql(&self, db: Postgres) -> rhombus::Result<()> {
        db.pool
            .execute(include_str!("../migrations/standalone.sql"))
            .await?;
        Ok(())
    }
}

async fn route_home(
    rhombus: State<RouterState>,
    plugin: State<MyPluginRouterState>,
    Extension(user): Extension<MaybeTokenClaims>,
    Extension(lang): Extension<Languages>,
    uri: Uri,
) -> Html<String> {
    let location_url = { rhombus.settings.read().await.location_url.clone() };

    Html(
        rhombus
            .jinja
            .get_template("home.html")
            .unwrap()
            .render(context! {
                lang => lang,
                user => user,
                uri => uri.to_string(),
                location_url => location_url,
                a => &plugin.a,
                og_image => format!("{}/og-image.png", location_url)
            })
            .unwrap(),
    )
}
