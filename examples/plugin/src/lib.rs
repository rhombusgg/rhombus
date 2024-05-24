use axum::{
    extract::State,
    http::Uri,
    response::{Html, IntoResponse},
    routing, Extension, Router,
};
use fluent::FluentResource;
use minijinja::context;
use rhombus::{
    internal::{auth::MaybeUser, locales::Languages, router::RouterState},
    plugin::{RunContext, UploadProviderContext},
    LocalUploadProvider, Plugin, UploadProvider,
};
use sqlx::Executor;

#[derive(Clone)]
pub struct MyPlugin {
    state: MyPluginRouterState,
}

#[derive(Clone)]
struct MyPluginRouterState {
    a: i32,
}

impl MyPlugin {
    pub fn new(a: i32) -> Self {
        Self {
            state: MyPluginRouterState { a },
        }
    }
}

impl Plugin for MyPlugin {
    async fn upload_provider(
        &self,
        _: &UploadProviderContext<'_>,
    ) -> Option<impl UploadProvider + Send + Sync> {
        if self.state.a == 3 {
            tracing::info!(self.state.a, "Using plugin upload provider");
            let local = LocalUploadProvider::new("myplugin-uploads".into());
            Some(local)
        } else {
            None
        }
    }

    async fn run<U: UploadProvider>(
        &self,
        context: &mut RunContext<'_, U>,
    ) -> rhombus::Result<Router<RouterState>> {
        context
            .env
            .add_template("home.html", include_str!("../templates/home.html"))?;

        let res = FluentResource::try_new(
            "challenges = Challs\ntest1 = Hello there\nho = Hol".to_string(),
        )
        .unwrap();
        let bundle = context.localizations.bundles.get_mut("en").unwrap();
        bundle.add_resource_overriding(res);

        match context.rawdb {
            rhombus::builder::RawDb::Postgres(db) => {
                db.execute(include_str!("../migrations/standalone.sql"))
                    .await?;
            }
            rhombus::builder::RawDb::LibSQL(_) => {
                tracing::error!("Unsupported database type for MyPlugin");
            }
        }

        let plugin_state = self.state.clone();

        let router = Router::new()
            .route("/", routing::get(route_home))
            .layer(Extension(plugin_state));

        Ok(router)
    }
}

async fn route_home(
    State(rhombus): State<RouterState>,
    Extension(plugin): Extension<MyPluginRouterState>,
    Extension(user): Extension<MaybeUser>,
    Extension(lang): Extension<Languages>,
    uri: Uri,
) -> impl IntoResponse {
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
