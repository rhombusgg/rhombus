use std::net::IpAddr;

use async_trait::async_trait;
use cached::{proc_macro::cached, Cached};

use crate::{
    auth::User,
    database::{Challenge, Connection, Database, Team, TeamMeta},
    errors::RhombusError::UnknownDatabase,
    Result,
};

#[derive(Clone)]
pub struct DbCache {
    inner: Connection,
}

impl DbCache {
    pub fn new(inner: Connection) -> DbCache {
        DbCache { inner }
    }
}

impl From<Connection> for DbCache {
    fn from(value: Connection) -> Self {
        DbCache { inner: value }
    }
}

#[async_trait]
impl Database for DbCache {
    async fn migrate(&self) -> Result<()> {
        self.inner.migrate().await
    }

    async fn upsert_user(
        &self,
        name: &str,
        email: &str,
        avatar: &str,
        discord_id: &str,
    ) -> Result<i64> {
        let result = self
            .inner
            .upsert_user(name, email, avatar, discord_id)
            .await;
        if let Ok(result) = result {
            GET_USER_FROM_ID.lock().await.cache_remove(&result);
        }
        result
    }

    async fn insert_track(
        &self,
        ip: IpAddr,
        user_agent: Option<&str>,
        user_id: Option<i64>,
    ) -> Result<()> {
        self.inner.insert_track(ip, user_agent, user_id).await
    }

    async fn get_challenges(&self) -> Result<Vec<Challenge>> {
        self.inner.get_challenges().await
    }

    async fn get_team_meta_from_invite_token(
        &self,
        invite_token: &str,
    ) -> Result<Option<TeamMeta>> {
        self.inner
            .get_team_meta_from_invite_token(invite_token)
            .await
    }

    async fn get_team_from_id(&self, user_id: i64) -> Result<Team> {
        get_team_from_id(&self.inner, user_id)
            .await
            .ok_or(UnknownDatabase())
    }

    async fn add_user_to_team(&self, user_id: i64, team_id: i64) -> Result<()> {
        let result = self.inner.add_user_to_team(user_id, team_id).await;
        {
            GET_TEAM_FROM_ID.lock().await.cache_remove(&user_id);
        }
        result
    }

    async fn get_user_from_id(&self, user_id: i64) -> Result<User> {
        get_user_from_id(&self.inner, user_id)
            .await
            .ok_or(UnknownDatabase())
    }
}

#[cached(time = 30, key = "i64", convert = "{ team_id }")]
async fn get_team_from_id(db: &Connection, team_id: i64) -> Option<Team> {
    tracing::trace!(team_id, "cache miss: get_team_from_id");
    db.get_team_from_id(team_id).await.ok()
}

#[cached(time = 30, key = "i64", convert = "{ user_id }")]
async fn get_user_from_id(db: &Connection, user_id: i64) -> Option<User> {
    tracing::trace!(user_id, "cache miss: get_user_from_id");
    db.get_user_from_id(user_id).await.ok()
}
