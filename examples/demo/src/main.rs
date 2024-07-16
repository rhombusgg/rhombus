use std::time::Duration;

use chrono::prelude::*;
use futures::stream::StreamExt;
use tracing_subscriber::EnvFilter;

use rhombus::{
    axum::{http::Response, response::IntoResponse, routing, Extension, Router},
    internal::{
        auth::User,
        database::{
            cache::{clear_all_caches, USER_CACHE},
            libsql::{LibSQL, LibSQLConnection},
        },
    },
    libsql::params,
    Plugin, Result,
};

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env()
                .or_else(|_| EnvFilter::try_new("rhombus=trace,demo=trace"))
                .unwrap(),
        )
        .init();

    let app = rhombus::Builder::default()
        .load_env()
        .config_source(rhombus::config::File::with_name("config"))
        .extractor(rhombus::ip::maybe_peer_ip)
        .plugin(
            rhombus::challenge_loader_plugin::ChallengeLoaderPlugin::new(std::path::Path::new(
                "challenges",
            )),
        )
        .plugin(DemoPlugin)
        .build()
        .await
        .unwrap();

    let listener = tokio::net::TcpListener::bind(":::3000").await.unwrap();
    rhombus::axum::serve(
        listener,
        app.into_make_service_with_connect_info::<std::net::SocketAddr>(),
    )
    .await
    .unwrap();
}

struct DemoPlugin;

impl Plugin for DemoPlugin {
    async fn run<U: rhombus::UploadProvider>(
        &self,
        context: &mut rhombus::plugin::RunContext<'_, U>,
    ) -> rhombus::Result<rhombus::axum::Router<rhombus::internal::router::RouterState>> {
        context.templates.add_template(
            "head.html".to_string(),
            include_str!("../templates/head.html").to_string(),
        );

        context.templates.add_template(
            "account-cards.html".to_string(),
            include_str!("../templates/account-cards.html").to_string(),
        );

        context.templates.add_template(
            "footer.html".to_string(),
            include_str!("../templates/footer.html").to_string(),
        );

        let plugin_state = match context.rawdb {
            rhombus::builder::RawDb::LibSQL(db) => {
                delayed_backup_tables(db);
                database_resetter(db);
                DemoState::new(db)
            }
            _ => panic!("Unsupported database"),
        };

        let router = Router::new()
            .route("/demo/admin/grant", routing::get(route_grant_admin))
            .route("/demo/admin/revoke", routing::get(route_revoke_admin))
            .layer(Extension(plugin_state));

        Ok(router)
    }
}

#[derive(Clone)]
struct DemoState {
    libsql: &'static LibSQL,
}

impl DemoState {
    fn new(libsql: &'static LibSQL) -> Self {
        Self { libsql }
    }

    async fn grant_admin(&self, user_id: i64) -> Result<()> {
        let conn = self.libsql.connect()?;

        conn.execute(
            "UPDATE rhombus_user SET is_admin = 1 WHERE id = ?",
            params!(user_id),
        )
        .await?;

        USER_CACHE.remove(&user_id);

        Ok(())
    }

    async fn revoke_admin(&self, user_id: i64) -> Result<()> {
        let conn = self.libsql.connect()?;

        conn.execute(
            "UPDATE rhombus_user SET is_admin = 0 WHERE id = ?",
            params!(user_id),
        )
        .await?;

        USER_CACHE.remove(&user_id);

        Ok(())
    }
}

async fn route_grant_admin(
    Extension(plugin): Extension<DemoState>,
    Extension(user): Extension<User>,
) -> impl IntoResponse {
    plugin.grant_admin(user.id).await.unwrap();

    Response::builder()
        .header("HX-Refresh", "true")
        .body("".to_owned())
        .unwrap()
}

async fn route_revoke_admin(
    Extension(plugin): Extension<DemoState>,
    Extension(user): Extension<User>,
) -> impl IntoResponse {
    plugin.revoke_admin(user.id).await.unwrap();

    Response::builder()
        .header("HX-Refresh", "true")
        .body("".to_owned())
        .unwrap()
}

fn delayed_backup_tables(libsql: &'static LibSQL) {
    tokio::task::spawn(async move {
        // jankily wait for the database to be fully initialized (specifically, the divisions to be added to the database)
        tokio::time::sleep(Duration::from_secs(5)).await;
        backup_tables(libsql).await.unwrap();
        tracing::info!("Backed up tables");
    });
}

async fn backup_tables(libsql: &'static LibSQL) -> Result<()> {
    let conn = libsql.connect()?;

    let tx = conn.transaction().await?;

    let tables = tx
        .query(
            "SELECT tbl_name FROM sqlite_master WHERE type = 'table' AND tbl_name NOT LIKE 'backup_%'",
            params!(),
        )
        .await?.into_stream()
        .map(|row| row.unwrap().get::<String>(0).unwrap())
        .collect::<Vec<_>>()
        .await;

    for table_name in tables {
        tx.execute(
            &format!("DROP TABLE IF EXISTS backup_{}", table_name),
            params!(),
        )
        .await?;

        tx.execute(
            &format!(
                "CREATE TABLE backup_{} AS SELECT * FROM {}",
                table_name, table_name
            ),
            params!(),
        )
        .await?;
    }

    tx.commit().await?;

    Ok(())
}

async fn reset_database(libsql: &'static LibSQL) -> Result<()> {
    let conn = libsql.connect()?;

    conn.execute("PRAGMA foreign_keys = 0", params!()).await?;

    let tx = conn.transaction().await?;

    let mut tables = tx
        .query(
            "SELECT tbl_name FROM sqlite_master WHERE type = 'table' AND tbl_name LIKE 'backup_%'",
            params!(),
        )
        .await?;

    while let Some(row) = tables.next().await? {
        let table_name = row.get_str(0)?;

        let table_name = &table_name[7..];

        tx.execute(&format!("DELETE FROM {}", table_name), params!())
            .await?;

        tx.execute(
            &format!(
                "INSERT INTO {} SELECT * FROM backup_{}",
                table_name, table_name
            ),
            params!(),
        )
        .await?;
    }

    tx.commit().await?;

    conn.execute("PRAGMA foreign_keys = 1", params!()).await?;

    // Turso does not support VACUUM in libsql server :( https://github.com/tursodatabase/libsql/issues/1415
    #[cfg(debug_assertions)]
    conn.execute("VACUUM", params!()).await?;

    clear_all_caches().await;
    tracing::info!("Database reset successfully");

    Ok(())
}

fn database_resetter(libsql: &'static LibSQL) {
    tokio::task::spawn(async move {
        loop {
            let now = Utc::now();

            let seconds_until_next_10_minute_interval =
                ((10 - now.minute() % 10) * 60 - now.second()) as u64;

            tokio::time::sleep(Duration::from_secs(seconds_until_next_10_minute_interval)).await;

            reset_database(libsql).await.unwrap();
        }
    });
}
