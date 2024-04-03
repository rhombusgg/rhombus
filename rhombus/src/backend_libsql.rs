use anyhow::Result;
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use futures::stream::StreamExt;
use libsql::{de, params, Builder};
use serde::Deserialize;

use crate::database::{Challenge, Database};

#[derive(Clone)]
pub struct LibSQL {
    pub db: libsql::Connection,
}

impl LibSQL {
    pub async fn new_local(path: &str) -> Result<LibSQL> {
        let db = Builder::new_local(path).build().await?.connect()?;
        Ok(LibSQL { db })
    }

    pub async fn new_memory() -> Result<LibSQL> {
        let db = Builder::new_local(":memory:").build().await?.connect()?;
        Ok(LibSQL { db })
    }

    pub async fn new_remote(url: &str, auth_token: &str) -> Result<LibSQL> {
        let db = Builder::new_remote(url.to_string(), auth_token.to_string())
            .build()
            .await?
            .connect()?;
        Ok(LibSQL { db })
    }
}

impl From<libsql::Connection> for LibSQL {
    fn from(value: libsql::Connection) -> Self {
        LibSQL { db: value }
    }
}

#[async_trait]
impl Database for LibSQL {
    async fn migrate(&self) -> Result<()> {
        _ = self
            .db
            .execute_batch(include_str!("../migrations/libsql/0001_setup.up.sql"))
            .await?;
        Ok(())
    }

    async fn upsert_user(&self, name: &str, email: &str, avatar: &str, discord_id: &str) -> i64 {
        let mut rows = self.db.query(
            r#"
            INSERT INTO "User" (name, email, avatar, discord_id) VALUES (?1, ?2, ?3, ?4)
            ON CONFLICT (discord_id) DO UPDATE SET name = ?1, email = ?2, avatar = ?3, updated_at = CURRENT_TIMESTAMP
            RETURNING id
            "#
            , [name, email, avatar, discord_id]).await.unwrap();
        let row = rows.next().await.unwrap().unwrap();
        row.get::<i64>(0).unwrap()
    }

    async fn insert_track(&self, ip: &str, user_agent: Option<&str>, now: DateTime<Utc>) {
        self.db
            .execute(
                r#"
            INSERT INTO track (ip, user_agent, last_seen_at) VALUES (?1, ?2, ?3)
            ON CONFLICT (ip, user_agent) DO
                UPDATE SET
                    last_seen_at = ?3,
                    requests = track.requests + 1
            "#,
                params!(ip, user_agent, now.to_string()),
            )
            .await
            .unwrap();
    }

    async fn insert_track_user(
        &self,
        ip: &str,
        user_agent: Option<&str>,
        user_id: i64,
        now: DateTime<Utc>,
    ) {
        self.db
            .execute(
                r#"
            INSERT INTO track_connection (ip, user_agent, user_id, last_seen_at) VALUES (?1, ?2, ?3, ?4)
            ON CONFLICT (ip, user_agent, user_id) DO
                UPDATE SET
                    last_seen_at = ?4,
                    requests = track_connection.requests + 1
            "#,
                params!(ip, user_agent, user_id, now.to_string()),
            )
            .await
            .unwrap();
    }

    async fn get_challenges(&self) -> Vec<Challenge> {
        let rows = self.db.query("SELECT * FROM challenge", ()).await.unwrap();

        #[derive(Debug, Deserialize)]
        struct DbChallenge {
            id: i64,
            name: String,
            description: String,
        }

        let challenges = rows
            .into_stream()
            .map(|row| de::from_row::<DbChallenge>(&row.unwrap()).unwrap())
            .collect::<Vec<DbChallenge>>()
            .await;

        challenges
            .into_iter()
            .map(|challenge| Challenge {
                id: challenge.id,
                name: challenge.name,
                description: challenge.description,
            })
            .collect()
    }
}
