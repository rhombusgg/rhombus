use std::{
    collections::BTreeMap,
    net::IpAddr,
    num::NonZeroU64,
    sync::{Arc, Weak},
};

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use serde::Serialize;
use tokio_util::bytes::Bytes;

use crate::{
    internal::{auth::User, database::cache::Writeups, division::Division, settings::Settings},
    Result,
};

pub type Connection = Arc<dyn Database + Send + Sync>;
pub type WeakConnection = Weak<dyn Database + Send + Sync>;

#[derive(Debug, Serialize, Clone)]
pub enum ScoringType {
    Dynamic,
    Static,
}

impl From<i64> for ScoringType {
    fn from(value: i64) -> Self {
        match value {
            0 => ScoringType::Dynamic,
            _ => ScoringType::Static,
        }
    }
}

#[derive(Debug, Serialize, Clone)]
pub struct ChallengeDivisionPoints {
    pub division_id: i64,
    pub points: u64,
    pub solves: u64,
}

#[derive(Debug, Serialize, Clone)]
pub struct ChallengeAttachment {
    pub name: String,
    pub url: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct Challenge {
    pub id: i64,
    pub name: String,
    pub description: String,
    pub category_id: i64,
    pub author_id: i64,
    pub healthscript: Option<String>,
    pub healthy: Option<bool>,
    pub last_healthcheck: Option<DateTime<Utc>>,
    pub division_points: Vec<ChallengeDivisionPoints>,
    pub scoring_type: ScoringType,
    pub flag: String,
    pub ticket_template: Option<String>,
    pub attachments: Vec<ChallengeAttachment>,
}

#[derive(Debug, Serialize, Clone)]
pub struct ChallengeDivision {
    pub name: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct Category {
    pub id: i64,
    pub name: String,
    pub color: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct Author {
    pub name: String,
    pub avatar_url: String,
    pub discord_id: NonZeroU64,
}

#[derive(Debug, Serialize, Clone)]
pub struct ChallengeData {
    pub challenges: Vec<Challenge>,
    pub categories: Vec<Category>,
    pub authors: BTreeMap<i64, Author>,
    pub divisions: BTreeMap<i64, ChallengeDivision>,
}

pub type Challenges = Arc<ChallengeData>;

#[derive(Debug, Serialize, Clone, PartialEq, PartialOrd)]
pub struct ChallengeSolve {
    pub solved_at: DateTime<Utc>,
    pub user_id: i64,
}

#[derive(Debug, Serialize, Clone)]
pub struct TeamUser {
    pub name: String,
    pub avatar_url: String,
    pub is_team_owner: bool,
    pub discord_id: Option<NonZeroU64>,
}

#[derive(Debug, Serialize, Clone)]
pub struct Writeup {
    pub user_id: i64,
    pub url: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct TeamInner {
    pub id: i64,
    pub name: String,
    pub invite_token: String,
    pub users: BTreeMap<i64, TeamUser>,
    pub solves: BTreeMap<i64, ChallengeSolve>,
    pub writeups: BTreeMap<i64, Vec<Writeup>>,
}

pub type Team = Arc<TeamInner>;

#[derive(Debug, Serialize, Clone)]
pub struct TeamMetaInner {
    pub id: i64,
    pub name: String,
}

pub type TeamMeta = Arc<TeamMetaInner>;

#[derive(Debug, Serialize, Clone)]
pub struct FirstBloods {
    pub division_ids: Vec<i64>,
}

#[derive(Debug, Serialize, Clone)]
pub struct ScoreboardSeriesPoint {
    pub timestamp: i64,
    pub total_score: i64,
}

#[derive(Debug, Serialize, Clone)]
pub struct ScoreboardTeam {
    pub team_name: String,
    pub series: Vec<ScoreboardSeriesPoint>,
}

#[derive(Debug, Serialize, Clone)]
pub struct Scoreboard {
    pub teams: BTreeMap<i64, ScoreboardTeam>,
}

#[derive(Debug, Serialize, Clone)]
pub struct LeaderboardEntry {
    pub team_id: i64,
    pub team_name: String,
    pub score: i64,
    pub rank: u64,
}

#[derive(Debug, Serialize, Clone)]
pub struct Leaderboard {
    pub num_pages: u64,
    pub entries: Vec<LeaderboardEntry>,
}

#[derive(Debug, Serialize, Clone)]
pub struct Email {
    pub address: String,
    pub verified: bool,
}

#[derive(Debug, Serialize, Clone)]
pub struct TeamStandingEntry {
    pub points: u64,
    pub rank: u64,
}

#[derive(Debug, Serialize, Clone)]
pub struct TeamStandings {
    pub standings: BTreeMap<i64, TeamStandingEntry>,
}

#[derive(Debug, Serialize, Clone)]
pub struct Ticket {
    pub ticket_number: u64,
    pub user_id: i64,
    pub challenge_id: i64,
    pub closed_at: Option<DateTime<Utc>>,
    pub discord_channel_id: NonZeroU64,
    pub email_references: Vec<String>,
    pub email_in_reply_to: Option<String>,
}

#[async_trait]
pub trait Database {
    async fn migrate(&self) -> Result<()>;
    async fn get_challenges(&self) -> Result<Challenges>;
    async fn set_challenge_health(
        &self,
        challenge_id: i64,
        healthy: Option<bool>,
        checked_at: DateTime<Utc>,
    ) -> Result<()>;
    async fn upsert_user_by_discord_id(
        &self,
        name: &str,
        email: &str,
        avatar: &str,
        discord_id: NonZeroU64,
        user_id: Option<i64>,
    ) -> Result<(i64, i64)>;
    async fn upsert_user_by_email(
        &self,
        name: &str,
        email: &str,
        avatar: &str,
    ) -> Result<(i64, i64)>;
    async fn upsert_user_by_credentials(
        &self,
        username: &str,
        avatar: &str,
        password: &str,
    ) -> Result<Option<(i64, i64)>>;
    async fn upsert_user_by_ctftime(
        &self,
        name: &str,
        email: &str,
        avatar: &str,
        ctftime_user_id: i64,
        ctftime_team_id: i64,
        team_name: &str,
    ) -> Result<(i64, i64, Option<String>)>;
    async fn insert_track(
        &self,
        ip: IpAddr,
        user_agent: Option<&str>,
        user_id: Option<i64>,
        requests: u64,
    ) -> Result<()>;
    async fn get_team_meta_from_invite_token(&self, invite_token: &str)
        -> Result<Option<TeamMeta>>;
    async fn get_team_from_id(&self, team_id: i64) -> Result<Team>;
    async fn add_user_to_team(&self, user_id: i64, team_id: i64) -> Result<()>;
    async fn solve_challenge(
        &self,
        user_id: i64,
        team_id: i64,
        challenge: &Challenge,
    ) -> Result<FirstBloods>;
    async fn get_user_from_id(&self, user_id: i64) -> Result<User>;
    async fn get_user_from_discord_id(&self, discord_id: NonZeroU64) -> Result<User>;
    async fn kick_user(&self, user_id: i64, team_id: i64) -> Result<()>;
    async fn roll_invite_token(&self, team_id: i64) -> Result<String>;
    async fn set_team_name(&self, team_id: i64, new_team_name: &str) -> Result<()>;
    async fn set_account_name(
        &self,
        user_id: i64,
        team_id: i64,
        new_account_name: &str,
    ) -> Result<()>;
    async fn add_writeup(
        &self,
        user_id: i64,
        team_id: i64,
        challenge_id: i64,
        writeup_url: &str,
    ) -> Result<()>;
    async fn get_writeups_from_user_id(&self, user_id: i64) -> Result<Writeups>;
    async fn delete_writeup(&self, challenge_id: i64, user_id: i64, team_id: i64) -> Result<()>;
    async fn get_next_ticket_number(&self) -> Result<u64>;
    async fn create_ticket(
        &self,
        ticket_number: u64,
        user_id: i64,
        challenge_id: i64,
        discord_channel_id: NonZeroU64,
    ) -> Result<()>;
    async fn get_ticket_by_ticket_number(&self, ticket_number: u64) -> Result<Ticket>;
    async fn get_ticket_by_discord_channel_id(
        &self,
        discord_channel_id: NonZeroU64,
    ) -> Result<Ticket>;
    async fn close_ticket(&self, ticket_number: u64, time: DateTime<Utc>) -> Result<()>;
    async fn reopen_ticket(&self, ticket_number: u64) -> Result<()>;
    async fn add_email_message_id_to_ticket(
        &self,
        ticket_number: u64,
        message_id: &str,
        user_sent: bool,
    ) -> Result<()>;
    async fn get_ticket_number_by_message_id(&self, message_id: &str) -> Result<u64>;
    async fn save_settings(&self, settings: &Settings) -> Result<()>;
    async fn load_settings(&self, settings: &mut Settings) -> Result<()>;
    async fn get_scoreboard(&self, division_id: i64) -> Result<Scoreboard>;
    async fn get_leaderboard(&self, division_id: i64, page: Option<u64>) -> Result<Leaderboard>;
    async fn get_emails_for_user_id(&self, user_id: i64) -> Result<Vec<Email>>;
    async fn create_email_verification_callback_code(
        &self,
        user_id: i64,
        email: &str,
    ) -> Result<String>;
    async fn verify_email_verification_callback_code(&self, code: &str) -> Result<()>;
    async fn get_email_verification_by_callback_code(&self, code: &str) -> Result<String>;
    async fn create_email_signin_callback_code(&self, email: &str) -> Result<String>;
    async fn verify_email_signin_callback_code(&self, code: &str) -> Result<String>;
    async fn get_email_signin_by_callback_code(&self, code: &str) -> Result<String>;
    async fn delete_email(&self, user_id: i64, email: &str) -> Result<()>;
    async fn get_user_divisions(&self, user_id: i64) -> Result<Vec<i64>>;
    async fn set_user_division(
        &self,
        user_id: i64,
        team_id: i64,
        division_id: i64,
        join: bool,
    ) -> Result<()>;
    async fn insert_divisions(&self, divisions: &[Division]) -> Result<()>;
    async fn get_team_divisions(&self, team_id: i64) -> Result<Vec<i64>>;
    async fn set_team_division(&self, team_id: i64, division_id: i64, join: bool) -> Result<()>;
    async fn get_team_standings(&self, team_id: i64) -> Result<TeamStandings>;
    async fn upload_file(&self, hash: &str, filename: &str, bytes: &[u8]) -> Result<()>;
    async fn download_file(&self, hash: &str) -> Result<(Bytes, String)>;
}
