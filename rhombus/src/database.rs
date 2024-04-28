use std::{net::IpAddr, sync::Arc};

use async_trait::async_trait;
use serde::Serialize;

use crate::{auth::User, Result};

pub type Connection = Arc<dyn Database + Send + Sync>;

#[derive(Debug, Serialize)]
pub struct Challenge {
    pub id: i64,
    pub name: String,
    pub description: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct Team {
    pub id: i64,
    pub name: String,
}

#[async_trait]
pub trait Database {
    async fn migrate(&self) -> Result<()>;
    async fn upsert_user(
        &self,
        name: &str,
        email: &str,
        avatar: &str,
        discord_id: &str,
    ) -> (i64, i64);
    async fn insert_track(&self, ip: IpAddr, user_agent: Option<&str>, user_id: Option<i64>);
    async fn get_challenges(&self) -> Vec<Challenge>;
    async fn get_team_from_invite_token(&self, invite_token: &str) -> Result<Option<Team>>;
    async fn get_team_from_user_id(&self, user_id: i64) -> Result<Team>;
    async fn add_user_to_team(&self, user_id: i64, team_id: i64) -> Result<()>;
    async fn get_user_from_id(&self, user_id: i64) -> Result<User>;
}
