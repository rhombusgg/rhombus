use std::net::IpAddr;

use async_trait::async_trait;
use cached::{
    proc_macro::{cached, once},
    Cached,
};

use crate::{errors::RhombusError::UnknownDatabase, internal::auth::User, Result};

use super::database::{Challenge, Connection, Database, Team, TeamMeta};

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
        get_challenges(&self.inner).await.ok_or(UnknownDatabase())
    }

    async fn get_team_meta_from_invite_token(
        &self,
        invite_token: &str,
    ) -> Result<Option<TeamMeta>> {
        self.inner
            .get_team_meta_from_invite_token(invite_token)
            .await
    }

    async fn get_team_from_id(&self, team_id: i64) -> Result<Team> {
        get_team_from_id(&self.inner, team_id)
            .await
            .ok_or(UnknownDatabase())
    }

    async fn add_user_to_team(
        &self,
        user_id: i64,
        team_id: i64,
        old_team_id: Option<i64>,
    ) -> Result<()> {
        let result = self
            .inner
            .add_user_to_team(user_id, team_id, old_team_id)
            .await;
        if result.is_ok() {
            {
                GET_TEAM_FROM_ID.lock().await.cache_remove(&team_id);
            }
            {
                GET_USER_FROM_ID.lock().await.cache_remove(&user_id);
            }
            if let Some(old_team_id) = old_team_id {
                GET_TEAM_FROM_ID.lock().await.cache_remove(&old_team_id);
            }
        }
        result
    }

    async fn get_user_from_id(&self, user_id: i64) -> Result<User> {
        get_user_from_id(&self.inner, user_id)
            .await
            .ok_or(UnknownDatabase())
    }

    async fn roll_invite_token(&self, team_id: i64) -> Result<String> {
        let new_invite_token = self.inner.roll_invite_token(team_id).await;
        if new_invite_token.is_ok() {
            GET_TEAM_FROM_ID.lock().await.cache_remove(&team_id);
        }
        new_invite_token
    }

    async fn set_team_name(&self, team_id: i64, new_team_name: &str) -> Result<()> {
        let result = self.inner.set_team_name(team_id, new_team_name).await;
        if result.is_ok() {
            GET_TEAM_FROM_ID.lock().await.cache_remove(&team_id);
        }
        result
    }
}

#[once(time = 30, sync_writes = true)]
async fn get_challenges(db: &Connection) -> Option<Vec<Challenge>> {
    tracing::trace!("cache miss: challenges");
    db.get_challenges().await.ok()
}

#[cached(time = 30, key = "i64", convert = "{ team_id }", sync_writes = true)]
async fn get_team_from_id(db: &Connection, team_id: i64) -> Option<Team> {
    tracing::trace!(team_id, "cache miss: get_team_from_id");
    db.get_team_from_id(team_id).await.ok()
}

#[cached(time = 30, key = "i64", convert = "{ user_id }", sync_writes = true)]
async fn get_user_from_id(db: &Connection, user_id: i64) -> Option<User> {
    tracing::trace!(user_id, "cache miss: get_user_from_id");
    db.get_user_from_id(user_id).await.ok()
}
