use async_trait::async_trait;
use chrono::{DateTime, Utc};
use futures::stream::StreamExt;
use libsql::{de, params, Builder};
use serde::Deserialize;

use crate::{
    database::{Challenge, Database, Team},
    team::create_team_invite_token,
    Result,
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

    async fn upsert_user(
        &self,
        name: &str,
        email: &str,
        avatar: &str,
        discord_id: &str,
    ) -> (i64, i64) {
        let team_name = format!("{}'s team", name);

        #[derive(Debug, Deserialize)]
        struct ExistingUser {
            id: i64,
            team_id: i64,
        }
        let tx = self.db.transaction().await.unwrap();
        let mut rows = tx
            .query(
                "SELECT id, team_id FROM user WHERE discord_id = ?",
                [discord_id],
            )
            .await
            .unwrap();
        let existing_user = rows
            .next()
            .await
            .unwrap()
            .map(|row| de::from_row::<ExistingUser>(&row).unwrap());
        if let Some(existing_user) = existing_user {
            return (existing_user.id, existing_user.team_id);
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

        let user_id = tx
            .query(
                "INSERT INTO user (name, avatar, discord_id, team_id, owner_team_id) VALUES (?1, ?2, ?3, ?4, ?4) RETURNING id",
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

        tx.execute(
            "INSERT INTO email (email, user_id) VALUES (?1, ?2)",
            params!(email, user_id),
        )
        .await
        .unwrap();

        tx.commit().await.unwrap();

        return (user_id, team_id);
    }

    async fn insert_track(&self, ip: &str, user_agent: Option<&str>, now: DateTime<Utc>, user_id: Option<i64>) {
        self.db
            .execute(
                r#"
            INSERT INTO track (ip, user_agent, last_seen_at, user_id) VALUES (?1, ?2, ?3, ?4)
            ON CONFLICT (ip, user_agent) DO
                UPDATE SET
                    user_id = ?4,
                    last_seen_at = ?3,
                    requests = track.requests + 1
            "#,
                params!(ip, user_agent, now.to_string(), user_id),
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

    async fn get_team_from_invite_token(&self, invite_token: &str) -> Result<Option<Team>> {
        #[derive(Debug, Deserialize)]
        struct DbTeam {
            id: i64,
            name: String,
        }
        let team = self
            .db
            .query(
                "SELECT id, name FROM team WHERE invite_token = ?",
                [invite_token],
            )
            .await?
            .next()
            .await?;

        if let Some(row) = &team {
            let team = de::from_row::<DbTeam>(row).unwrap();
            Ok(Some(Team {
                id: team.id,
                name: team.name,
            }))
        } else {
            Ok(None)
        }
    }

    async fn get_team_from_user_id(&self, user_id: i64) -> Result<Team> {
        #[derive(Debug, Deserialize)]
        struct DbTeam {
            id: i64,
            name: String,
        }
        let row = self
            .db
            .query(
                "
                SELECT team.id, team.name
                FROM team JOIN user ON user.team_id = team.id
                WHERE user.id = ?1
            ",
                [user_id],
            )
            .await?
            .next()
            .await?
            .ok_or(libsql::Error::QueryReturnedNoRows)?;

        let team = de::from_row::<DbTeam>(&row).unwrap();
        Ok(Team {
            id: team.id,
            name: team.name,
        })
    }

    async fn add_user_to_team(&self, user_id: i64, team_id: i64) -> Result<()> {
        self.db
            .execute(
                r#"
                UPDATE user
                SET team_id = ?2
                WHERE id = ?1
            "#,
                [user_id, team_id],
            )
            .await?;
        Ok(())
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
