use std::sync::Arc;

use anyhow::Result;
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use serde::Serialize;

pub type Connection = Arc<dyn Database + Send + Sync>;

#[derive(Debug, Serialize)]
pub struct Challenge {
    pub id: i64,
    pub name: String,
    pub description: String,
}

#[async_trait]
pub trait Database {
    async fn migrate(&self) -> Result<()>;
    async fn upsert_user(&self, name: &str, email: &str, avatar: &str, discord_id: &str) -> i64;
    async fn insert_track(&self, ip: &str, user_agent: Option<&str>, now: DateTime<Utc>);
    async fn insert_track_user(
        &self,
        ip: &str,
        user_agent: Option<&str>,
        user_id: i64,
        now: DateTime<Utc>,
    );
    async fn get_challenges(&self) -> Vec<Challenge>;
}
