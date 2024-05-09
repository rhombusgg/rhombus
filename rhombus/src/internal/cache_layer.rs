use std::{net::IpAddr, time::Duration};

use async_trait::async_trait;
use dashmap::DashMap;
use tokio::sync::RwLock;

use crate::{internal::auth::User, Result};

use super::database::{Challenges, Connection, Database, Team, TeamMeta};

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
            // GET_USER_FROM_ID.lock().await.cache_remove(&result);
            USER_CACHE.remove(&result);
        }
        result
    }

    async fn insert_track(
        &self,
        ip: IpAddr,
        user_agent: Option<&str>,
        user_id: Option<i64>,
        requests: u64,
    ) -> Result<()> {
        self.inner
            .insert_track(ip, user_agent, user_id, requests)
            .await
    }

    async fn get_challenges(&self) -> Result<Challenges> {
        get_challenges(&self.inner).await
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
        get_team_from_id(&self.inner, team_id).await
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
            TEAM_CACHE.remove(&team_id);
            USER_CACHE.remove(&user_id);
            if let Some(old_team_id) = old_team_id {
                TEAM_CACHE.remove(&old_team_id);
            }
        }
        result
    }

    async fn get_user_from_id(&self, user_id: i64) -> Result<User> {
        get_user_from_id(&self.inner, user_id).await
    }

    async fn roll_invite_token(&self, team_id: i64) -> Result<String> {
        let new_invite_token = self.inner.roll_invite_token(team_id).await;
        if new_invite_token.is_ok() {
            TEAM_CACHE.remove(&team_id);
        }
        new_invite_token
    }

    async fn set_team_name(&self, team_id: i64, new_team_name: &str) -> Result<()> {
        let result = self.inner.set_team_name(team_id, new_team_name).await;
        if result.is_ok() {
            TEAM_CACHE.remove(&team_id);
        }
        result
    }

    async fn solve_challenge(
        &self,
        user_id: i64,
        challenge_id: i64,
        team_id: i64,
        new_team_score: i64,
    ) -> Result<()> {
        let result = self
            .inner
            .solve_challenge(user_id, challenge_id, team_id, new_team_score)
            .await;
        if result.is_ok() {
            TEAM_CACHE.remove(&team_id);
            *CHALLENGES_CACHE.write().await = None;
        }
        result
    }
}

lazy_static::lazy_static! {
    pub static ref CHALLENGES_CACHE: RwLock<Option<Challenges>> = None.into();
}

pub async fn get_challenges(db: &Connection) -> Result<Challenges> {
    if let Some(challenges) = &*CHALLENGES_CACHE.read().await {
        return Ok(challenges.clone());
    }
    tracing::trace!("cache miss: challenges");

    let challenges = db.get_challenges().await;

    if let Ok(challenges) = &challenges {
        let mut cache = CHALLENGES_CACHE.write().await;
        *cache = Some(challenges.clone());
    }

    challenges
}

lazy_static::lazy_static! {
    pub static ref TEAM_CACHE: DashMap<i64, TimedCache<Team>> = DashMap::new();
}

pub async fn get_team_from_id(db: &Connection, team_id: i64) -> Result<Team> {
    if let Some(team) = TEAM_CACHE.get(&team_id) {
        return Ok(team.value.clone());
    }
    tracing::trace!(team_id, "cache miss: get_team_from_id");

    let team = db.get_team_from_id(team_id).await;

    if let Ok(team) = &team {
        TEAM_CACHE.insert(team_id, TimedCache::new(team.clone()));
    }
    team
}

pub struct TimedCache<T> {
    pub value: T,
    pub insert_timestamp: i64,
}

impl<T> TimedCache<T> {
    #[inline(always)]
    pub fn new(value: T) -> Self {
        TimedCache {
            value,
            insert_timestamp: chrono::Utc::now().timestamp(),
        }
    }
}

lazy_static::lazy_static! {
    pub static ref USER_CACHE: DashMap<i64, TimedCache<User>> = DashMap::new();
}

pub async fn get_user_from_id(db: &Connection, user_id: i64) -> Result<User> {
    if let Some(user) = USER_CACHE.get(&user_id) {
        return Ok(user.value.clone());
    }
    tracing::trace!(user_id, "cache miss: get_user_from_id");

    let user = db.get_user_from_id(user_id).await;

    if let Ok(user) = &user {
        USER_CACHE.insert(user_id, TimedCache::new(user.clone()));
    }
    user
}

pub fn database_cache_evictor(seconds: u64) {
    tokio::task::spawn(async move {
        let duration = Duration::from_secs(seconds);
        loop {
            tokio::time::sleep(duration).await;
            let evict_threshold = (chrono::Utc::now() - duration).timestamp();

            let mut count: i64 = 0;
            USER_CACHE.retain(|_, v| {
                if v.insert_timestamp > evict_threshold {
                    true
                } else {
                    count += 1;
                    false
                }
            });
            if count > 0 {
                tracing::trace!(count, "Evicted user cache");
            }

            let mut count: i64 = 0;
            TEAM_CACHE.retain(|_, v| {
                if v.insert_timestamp > evict_threshold {
                    true
                } else {
                    count += 1;
                    false
                }
            });
            if count > 0 {
                tracing::trace!(count, "Evicted team cache");
            }

            {
                let mut challenges = CHALLENGES_CACHE.write().await;
                if challenges.is_some() {
                    tracing::trace!("Evicted challenges cache");
                    *challenges = None
                }
            }
        }
    });
}
