use std::net::IpAddr;

use async_trait::async_trait;
use sqlx::{FromRow, PgPool};

use super::{
    auth::User,
    database::{Challenge, Database, Team, TeamMeta},
};
use crate::Result;

#[derive(Clone)]
pub struct Postgres {
    pub pool: PgPool,
}

impl Postgres {
    pub fn new(db: PgPool) -> Self {
        Postgres { pool: db }
    }
}

#[async_trait]
impl Database for Postgres {
    async fn migrate(&self) -> Result<()> {
        Ok(sqlx::migrate!("migrations/postgresql")
            .run(&self.pool)
            .await?)
    }

    async fn upsert_user(
        &self,
        name: &str,
        email: &str,
        avatar: &str,
        discord_id: &str,
    ) -> Result<i64> {
        #[derive(FromRow)]
        struct InsertUserResult {
            id: i64,
        }

        let user = sqlx::query_as::<_, InsertUserResult>(
            r#"
            INSERT INTO "User" (name, email, avatar, discord_id) VALUES ($1, $2, $3, $4)
            ON CONFLICT (discord_id) DO UPDATE SET name = $1, email = $2, avatar = $3, updated_at = now()
            RETURNING id
            "#
        )
        .bind(name)
        .bind(email)
        .bind(avatar)
        .bind(discord_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(user.id)
    }

    async fn insert_track(
        &self,
        ip: IpAddr,
        user_agent: Option<&str>,
        user_id: Option<i64>,
    ) -> Result<()> {
        sqlx::query(
            r#"
            INSERT INTO Track (ip, user_agent, last_seen_at, user_id) VALUES ($1, $2, now(), $3)
            ON CONFLICT (ip, user_agent) DO
                UPDATE SET
                    user_id = ?3,
                    last_seen_at = now(),
                    requests = Track.requests + 1
            "#,
        )
        .bind(ip.to_string())
        .bind(user_agent)
        .bind(user_id)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    async fn get_challenges(&self) -> Result<Vec<Challenge>> {
        #[derive(FromRow)]
        struct DBChallenge {
            id: i64,
            name: String,
            description: String,
        }

        let challenges = sqlx::query_as::<_, DBChallenge>("SELECT * FROM challenge")
            .fetch_all(&self.pool)
            .await?;

        Ok(challenges
            .into_iter()
            .map(|challenge| Challenge {
                id: challenge.id,
                name: challenge.name,
                description: challenge.description,
            })
            .collect())
    }

    async fn get_team_meta_from_invite_token(
        &self,
        _invite_token: &str,
    ) -> Result<Option<TeamMeta>> {
        todo!()
    }

    async fn get_team_from_id(&self, _user_id: i64) -> Result<Team> {
        todo!()
    }

    async fn add_user_to_team(&self, _user_id: i64, _team_id: i64) -> Result<()> {
        todo!()
    }

    async fn get_user_from_id(&self, _user_id: i64) -> Result<User> {
        todo!()
    }

    async fn roll_invite_token(&self, _team_id: i64) -> Result<String> {
        todo!()
    }

    async fn set_team_name(&self, _team_id: i64, _new_team_name: &str) -> Result<()> {
        todo!()
    }
}

#[cfg(test)]
mod test {
    use sqlx::postgres::PgPoolOptions;
    use testcontainers::clients;
    use testcontainers_modules::postgres::Postgres;

    use crate::internal::database::Database;

    #[cfg_attr(not(feature = "testcontainers"), ignore)]
    #[tokio::test]
    async fn migrate_postgres() {
        let docker = clients::Cli::default();
        let postgres_instance = docker.run(Postgres::default());
        let database_url = format!(
            "postgres://postgres:postgres@127.0.0.1:{}/postgres",
            postgres_instance.get_host_port_ipv4(5432)
        );

        let pool = PgPoolOptions::new().connect(&database_url).await.unwrap();
        let database = crate::internal::backend_postgres::Postgres::new(pool);
        database.migrate().await.unwrap();
    }
}
