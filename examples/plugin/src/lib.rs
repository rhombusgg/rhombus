use std::{any::Any, sync::Arc};

use axum::{
    extract::State,
    response::{Html, IntoResponse},
    routing, Extension, Router,
};
use fluent::FluentResource;
use minijinja::context;
use rhombus::{
    async_trait::async_trait,
    internal::{
        auth::MaybeUser,
        database::provider::{Connection, Database},
        division::DivisionEligible,
        router::RouterState,
        routes::meta::PageMeta,
    },
    plugin::{DatabaseProviderContext, PluginMeta, RunContext},
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
}

impl MyPlugin {
    pub fn new(a: i32) -> Self {
        Self {
            state: MyPluginRouterState { a },
        }
    }
}

#[async_trait]
impl Plugin for MyPlugin {
    fn meta(&self) -> PluginMeta {
        PluginMeta {
            name: env!("CARGO_PKG_NAME").into(),
            version: env!("CARGO_PKG_VERSION").into(),
            description: env!("CARGO_PKG_DESCRIPTION").into(),
        }
    }

    // async fn upload_provider(
    //     &self,
    //     _: &UploadProviderContext<'_>,
    // ) -> Option<impl UploadProvider + Send + Sync> {
    //     if self.state.a == 3 {
    //         tracing::info!(self.state.a, "Using plugin upload provider");
    //         let local = LocalUploadProvider::new("myplugin-uploads".into());
    //         Some(local)
    //     } else {
    //         None
    //     }
    // }

    async fn database_provider(
        &self,
        _context: &mut DatabaseProviderContext<'_>,
    ) -> Option<(Connection, Box<dyn Any + Send + Sync>)> {
        let mysql = sqlx::MySqlPool::connect("mysql://user:password@localhost/dbname")
            .await
            .unwrap();

        let core_db = rhombus::internal::database::libsql::InMemoryLibSQL::new()
            .await
            .unwrap();
        core_db.migrate().await.unwrap();

        Some((Arc::new(core_db), Box::new(mysql)))
    }

    async fn run(&self, context: &mut RunContext<'_>) -> rhombus::Result<Router<RouterState>> {
        context
            .templates
            .add_template("home.html", include_str!("../templates/home.html"));

        let res = FluentResource::try_new(
            "challenges = Challs\ntest1 = Hello there\nho = Hol".to_string(),
        )
        .unwrap();
        let bundle = context.localizations.bundles.get_mut("en").unwrap();
        bundle.add_resource_overriding(res);

        match context.rawdb {
            rhombus::builder::RawDb::Plugin(_) => {}
            rhombus::builder::RawDb::Postgres(db) => {
                db.pool
                    .execute(include_str!("../migrations/standalone.sql"))
                    .await?;
            }
            rhombus::builder::RawDb::LibSQL(_) => {
                tracing::error!("Unsupported database type for MyPlugin");
            }
        }

        let osu_division = context.divisions.iter_mut().find(|d| d.name == "OSU");
        if let Some(osu_division) = osu_division {
            tracing::info!("Found OSU division");
            let osu_division_eligibility_provider =
                OsuDivisionEligibilityProvider::new(context.db.clone());
            osu_division.division_eligibility = Arc::new(osu_division_eligibility_provider);
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
    Extension(page): Extension<PageMeta>,
) -> impl IntoResponse {
    Html(
        rhombus
            .jinja
            .get_template("home.html")
            .unwrap()
            .render(context! {
                global => rhombus.global_page_meta,
                page,
                user,
                a => &plugin.a,
            })
            .unwrap(),
    )
}

pub struct OsuDivisionEligibilityProvider {
    pub db: Connection,
}

impl OsuDivisionEligibilityProvider {
    pub fn new(db: Connection) -> Self {
        Self { db }
    }
}

#[async_trait]
impl DivisionEligible for OsuDivisionEligibilityProvider {
    async fn is_user_eligible(&self, user_id: i64) -> std::result::Result<bool, String> {
        let emails = self.db.get_emails_for_user_id(user_id).await.unwrap();
        let eligible = emails.iter().filter(|email| email.verified).count() >= 3;

        if eligible {
            Ok(true)
        } else {
            Err("Must have verified at least 3 emails.".to_string())
        }
    }
}
