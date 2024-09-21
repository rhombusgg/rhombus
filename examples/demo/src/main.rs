use std::{path::PathBuf, sync::Arc, time::Duration};

use chrono::prelude::*;
use fake::{
    faker::internet::en::{Password, Username},
    Dummy, Fake, Faker,
};
use futures::stream::StreamExt;
use rand::{
    distributions::{Alphanumeric, DistString},
    seq::SliceRandom,
    Rng,
};
use sha2::{Digest, Sha256};
use tokio::sync::RwLock;
use tracing_subscriber::EnvFilter;

use rhombus::{
    axum::{http::Response, response::IntoResponse, routing, Extension, Router},
    challenge_loader_plugin::ChallengeLoaderPlugin,
    internal::{
        auth::User,
        database::{
            cache::{clear_all_caches, USER_CACHE},
            libsql::{LibSQL, LibSQLConnection},
            provider::{Connection, Database},
        },
        settings::Settings,
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
        .plugin(DemoPlugin)
        .plugin(ChallengeLoaderPlugin::new(PathBuf::from("challenges")))
        .build()
        .await
        .unwrap();

    let listener = tokio::net::TcpListener::bind(":::3000").await.unwrap();
    app.serve(listener).await;
}

struct DemoPlugin;

impl Plugin for DemoPlugin {
    async fn run<U: rhombus::UploadProvider>(
        &self,
        context: &mut rhombus::plugin::RunContext<'_, U>,
    ) -> rhombus::Result<rhombus::axum::Router<rhombus::internal::router::RouterState>> {
        context
            .templates
            .add_template("head.html", include_str!("../templates/head.html"));

        context.templates.add_template(
            "account-cards.html",
            include_str!("../templates/account-cards.html"),
        );

        context
            .templates
            .add_template("footer.html", include_str!("../templates/footer.html"));

        let libsql = match context.rawdb {
            rhombus::builder::RawDb::LibSQL(db) => {
                {
                    let conn = db.connect()?;

                    conn.execute("PRAGMA foreign_keys = 0", params!()).await?;

                    let tx = conn.transaction().await?;

                    let tables = tx
                        .query(
                            "SELECT tbl_name FROM sqlite_master WHERE type = 'table'",
                            params!(),
                        )
                        .await?
                        .into_stream()
                        .map(|row| row.unwrap().get::<String>(0).unwrap())
                        .collect::<Vec<_>>()
                        .await;

                    for table_name in tables {
                        tx.execute(&format!("DROP TABLE IF EXISTS {}", table_name), params!())
                            .await?;
                    }

                    tx.commit().await?;

                    conn.execute("PRAGMA foreign_keys = 1", params!()).await?;
                }

                db.migrate().await?;

                {
                    let conn = db.connect()?;

                    _ = conn
                        .execute(
                            "
                    ALTER TABLE rhombus_user
                    ADD COLUMN is_bot BOOLEAN NOT NULL DEFAULT(FALSE)
                    ",
                            params!(),
                        )
                        .await;
                }

                delayed_backup_tables(db.clone());
                database_resetter(db.clone(), context.settings.clone());
                db
            }
            _ => panic!("Unsupported database"),
        };

        randomize_jwt(context.settings.clone()).await;

        solver(libsql.clone(), context.db.clone());
        team_creator(libsql.clone(), context.db.clone());

        let plugin_state = DemoState::new(libsql.clone());
        let router = Router::new()
            .route("/demo/admin/grant", routing::get(route_grant_admin))
            .route("/demo/admin/revoke", routing::get(route_revoke_admin))
            .layer(Extension(plugin_state));

        Ok(router)
    }
}

#[derive(Debug, Dummy)]
struct DummyUser {
    #[dummy(faker = "Username()")]
    username: String,

    #[dummy(faker = "Password(32..33)")]
    password: String,

    avatar: String,
}

fn create_dummy_user() -> DummyUser {
    let mut dummy_user: DummyUser = Faker.fake();

    let mut hasher = Sha256::new();
    hasher.update(&dummy_user.username);
    let hash = format!("{:x}", hasher.finalize());

    let avatar = format!(
        "https://seccdn.libravatar.org/avatar/{}?s=80&default=retro",
        hash
    );

    dummy_user.avatar = avatar;
    dummy_user
}

async fn set_user_to_bot(libsql: Arc<LibSQL>, user_id: i64) -> Result<()> {
    let conn = libsql.connect()?;

    conn.execute(
        "UPDATE rhombus_user SET is_bot = 1 WHERE id = ?",
        params!(user_id),
    )
    .await?;

    Ok(())
}

async fn join_to_divisons(
    db: Connection,
    division_ids: &[i64],
    user_id: i64,
    team_id: i64,
) -> Result<()> {
    for division_id in division_ids {
        db.set_user_division(user_id, team_id, *division_id, true)
            .await?;
        db.set_team_division(team_id, *division_id, true).await?;
    }

    Ok(())
}

async fn create_team(libsql: Arc<LibSQL>, db: Connection) -> Result<()> {
    let dummy_user = create_dummy_user();

    let division_ids = db
        .get_challenges()
        .await?
        .divisions
        .iter()
        .map(|d| *d.0)
        .collect::<Vec<_>>();

    let mut rng = rand::rngs::OsRng;
    let num_divisions = rng.gen_range(1..=division_ids.len().max(1));
    let division_ids = division_ids
        .choose_multiple(&mut rng, num_divisions)
        .copied()
        .collect::<Vec<_>>();

    let Some((user_id, team_id)) = db
        .upsert_user_by_credentials(
            &dummy_user.username,
            &dummy_user.avatar,
            &dummy_user.password,
        )
        .await?
    else {
        panic!()
    };

    join_to_divisons(db.clone(), &division_ids, user_id, team_id).await?;
    set_user_to_bot(libsql.clone(), user_id).await?;

    let num_members = rng.gen_range(0..3);

    for _ in 0..num_members {
        let dummy_user = create_dummy_user();
        let Some((user_id, _)) = db
            .upsert_user_by_credentials(
                &dummy_user.username,
                &dummy_user.avatar,
                &dummy_user.password,
            )
            .await?
        else {
            continue;
        };
        join_to_divisons(db.clone(), &division_ids, user_id, team_id).await?;
        set_user_to_bot(libsql.clone(), user_id).await?;
        db.add_user_to_team(user_id, team_id, None).await?;
    }

    Ok(())
}

async fn solve_challenge(libsql: Arc<LibSQL>, db: Connection) -> Result<()> {
    let conn = libsql.connect()?;

    if let Some((user_id, team_id)) = conn
        .query(
            "
            SELECT id, team_id FROM rhombus_user
            WHERE is_bot = 1
            ORDER BY RANDOM()
            LIMIT 1
            ",
            params!(),
        )
        .await?
        .next()
        .await?
        .map(|row| (row.get::<i64>(0).unwrap(), row.get::<i64>(1).unwrap()))
    {
        let mut rng = rand::rngs::OsRng;
        if let Some(challenge) = db.get_challenges().await?.challenges.choose(&mut rng) {
            db.solve_challenge(user_id, team_id, challenge).await?;
            tracing::info!(user_id, challenge_id = challenge.id, "Solved challenge");
        }
    }

    Ok(())
}

fn solver(libsql: Arc<LibSQL>, db: Connection) {
    tokio::task::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_secs(10)).await;
            _ = solve_challenge(libsql.clone(), db.clone()).await;
        }
    });
}

fn team_creator(libsql: Arc<LibSQL>, db: Connection) {
    tokio::task::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_secs(30)).await;
            _ = create_team(libsql.clone(), db.clone()).await;
        }
    });
}

#[derive(Clone)]
struct DemoState {
    libsql: Arc<LibSQL>,
}

impl DemoState {
    fn new(libsql: Arc<LibSQL>) -> Self {
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

fn delayed_backup_tables(libsql: Arc<LibSQL>) {
    tokio::task::spawn(async move {
        // jankily wait for the database to be fully initialized (specifically, the divisions to be added to the database)
        tokio::time::sleep(Duration::from_secs(5)).await;
        backup_tables(libsql).await.unwrap();
    });
}

async fn backup_tables(libsql: Arc<LibSQL>) -> Result<()> {
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

    tracing::info!("Backed up tables");

    Ok(())
}

async fn reset_database(libsql: Arc<LibSQL>) -> Result<()> {
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
    // #[cfg(debug_assertions)]
    conn.execute("VACUUM", params!()).await?;

    clear_all_caches().await;
    tracing::info!("Database reset successfully");

    Ok(())
}

fn database_resetter(libsql: Arc<LibSQL>, settings: Arc<RwLock<Settings>>) {
    tokio::task::spawn(async move {
        loop {
            let now = Utc::now();

            let seconds_until_next_30_minute_interval =
                ((30 - now.minute() % 30) * 60 - now.second()) as u64;

            tokio::time::sleep(Duration::from_secs(seconds_until_next_30_minute_interval)).await;

            randomize_jwt(settings.clone()).await;
            reset_database(libsql.clone()).await.unwrap();
        }
    });
}

async fn randomize_jwt(settings: Arc<RwLock<Settings>>) {
    let mut rng = rand::rngs::OsRng;
    let jwt_secret = Alphanumeric.sample_string(&mut rng, 64);
    settings.write().await.jwt_secret = jwt_secret;
}
