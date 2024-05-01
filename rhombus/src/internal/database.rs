use std::{net::IpAddr, sync::Arc};

use async_trait::async_trait;
use serde::Serialize;

use crate::{internal::auth::User, Result};

pub type Connection = Arc<dyn Database + Send + Sync>;

#[derive(Debug, Serialize)]
pub struct Challenge {
    pub id: i64,
    pub name: String,
    pub description: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct TeamUser {
    pub id: i64,
    pub name: String,
    pub avatar_url: String,
    pub is_team_owner: bool,
}

#[derive(Debug, Serialize, Clone)]
pub struct TeamInner {
    pub id: i64,
    pub name: String,
    pub invite_token: String,
    pub users: Vec<TeamUser>,
}

pub type Team = Arc<TeamInner>;

#[derive(Debug, Serialize, Clone)]
pub struct TeamMetaInner {
    pub id: i64,
    pub name: String,
}

pub type TeamMeta = Arc<TeamMetaInner>;

#[async_trait]
pub trait Database {
    async fn migrate(&self) -> Result<()>;
    async fn upsert_user(
        &self,
        name: &str,
        email: &str,
        avatar: &str,
        discord_id: &str,
    ) -> Result<i64>;
    async fn insert_track(
        &self,
        ip: IpAddr,
        user_agent: Option<&str>,
        user_id: Option<i64>,
    ) -> Result<()>;
    async fn get_challenges(&self) -> Result<Vec<Challenge>>;
    async fn get_team_meta_from_invite_token(&self, invite_token: &str)
        -> Result<Option<TeamMeta>>;
    async fn get_team_from_id(&self, team_id: i64) -> Result<Team>;
    async fn add_user_to_team(&self, user_id: i64, team_id: i64) -> Result<()>;
    async fn get_user_from_id(&self, user_id: i64) -> Result<User>;
    async fn roll_invite_token(&self, team_id: i64) -> Result<String>;
}
