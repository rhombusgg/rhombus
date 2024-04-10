use anyhow::Result;
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use futures::stream::StreamExt;
use libsql::{de, params, Builder};
use serde::Deserialize;

use crate::{
    database::{Challenge, Database},
    team::create_team_invite_token,
};

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
        let team_name = format!("{}'s team", name);

        let tx = self.db.transaction().await.unwrap();
        let mut rows = tx
            .query("SELECT id FROM user WHERE discord_id = ?", [discord_id])
            .await
            .unwrap();
        let user_id = rows
            .next()
            .await
            .unwrap()
            .map(|row| row.get::<i64>(0).unwrap());
        if let Some(user_id) = user_id {
            return user_id;
        }

        let team_invite_token = create_team_invite_token();

        let team_id = tx
            .query(
                "INSERT INTO team (name, invite_token) VALUES (?1, ?2) RETURNING id",
                [team_name, team_invite_token],
            )
            .await
            .unwrap()
            .next()
            .await
            .unwrap()
            .unwrap()
            .get::<i64>(0)
            .unwrap();

        tx.execute("INSERT INTO email (email) VALUES (?1)", [email])
            .await
            .unwrap();

        let user_id = tx
            .query(
                "INSERT INTO user (name, avatar, discord_id, team_id) VALUES (?1, ?2, ?3, ?4) RETURNING id",
                params!(name, avatar, discord_id, team_id),
            )
            .await
            .unwrap()
            .next()
            .await
            .unwrap()
            .unwrap()
            .get::<i64>(0)
            .unwrap();

        tx.commit().await.unwrap();

        return user_id;
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

#[cfg(test)]
mod test {
    use super::*;

    #[tokio::test]
    async fn migrate_libsql() {
        let database = LibSQL::new_memory().await.unwrap();
        database.migrate().await.unwrap();
    }
}
