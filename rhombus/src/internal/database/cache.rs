use std::{collections::BTreeMap, net::IpAddr, num::NonZeroU64, time::Duration};

use async_trait::async_trait;
use dashmap::DashMap;
use tokio::sync::RwLock;

use crate::{
    internal::{
        auth::User,
        database::provider::{
            Challenge, Challenges, Connection, Database, Email, FirstBloods, Leaderboard,
            Scoreboard, Team, TeamMeta, TeamStandings, Writeup,
        },
        division::Division,
        settings::Settings,
    },
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
        discord_id: NonZeroU64,
    ) -> Result<(i64, i64)> {
        let result = self
            .inner
            .upsert_user(name, email, avatar, discord_id)
            .await;
        if let Ok(result) = result {
            USER_CACHE.remove(&result.0);
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

    async fn get_user_from_discord_id(&self, discord_id: NonZeroU64) -> Result<User> {
        self.inner.get_user_from_discord_id(discord_id).await
    }

    async fn kick_user(&self, user_id: i64, team_id: i64) -> Result<()> {
        let result = self.inner.kick_user(user_id, team_id).await;
        if result.is_ok() {
            USER_CACHE.remove(&user_id);
            TEAM_CACHE.remove(&team_id);
        }
        result
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
        team_id: i64,
        challenge: &Challenge,
    ) -> Result<FirstBloods> {
        let result = self
            .inner
            .solve_challenge(user_id, team_id, challenge)
            .await;
        if result.is_ok() {
            USER_CACHE.remove(&user_id);
            TEAM_CACHE.clear();
            SCOREBOARD_CACHE.clear();
            LEADERBOARD_CACHE.clear();
            TEAM_STANDINGS.clear();
            *CHALLENGES_CACHE.write().await = None;
        }
        result
    }

    async fn add_writeup(
        &self,
        user_id: i64,
        team_id: i64,
        challenge_id: i64,
        writeup_url: &str,
    ) -> Result<()> {
        let result = self
            .inner
            .add_writeup(user_id, team_id, challenge_id, writeup_url)
            .await;
        if result.is_ok() {
            TEAM_CACHE.remove(&team_id);
            USER_WRITEUP_CACHE.remove(&user_id);
        }
        result
    }

    async fn get_writeups_from_user_id(&self, user_id: i64) -> Result<Writeups> {
        get_writeups_from_user_id(&self.inner, user_id).await
    }

    async fn delete_writeup(&self, challenge_id: i64, user_id: i64, team_id: i64) -> Result<()> {
        let result = self
            .inner
            .delete_writeup(challenge_id, user_id, team_id)
            .await;
        if result.is_ok() {
            TEAM_CACHE.remove(&team_id);
            USER_WRITEUP_CACHE.remove(&user_id);
        }
        result
    }

    async fn create_ticket(&self, user_id: i64, challenge_id: i64) -> Result<i64> {
        self.inner.create_ticket(user_id, challenge_id).await
    }

    async fn save_settings(&self, settings: &Settings) -> Result<()> {
        self.inner.save_settings(settings).await
    }

    async fn load_settings(&self, settings: &mut Settings) -> Result<()> {
        self.inner.load_settings(settings).await
    }

    async fn get_scoreboard(&self, division_id: i64) -> Result<Scoreboard> {
        get_scoreboard(&self.inner, division_id).await
    }

    async fn get_leaderboard(&self, division_id: i64, page: u64) -> Result<Leaderboard> {
        get_leaderboard(&self.inner, division_id, page).await
    }

    async fn get_emails_for_user_id(&self, user_id: i64) -> Result<Vec<Email>> {
        get_emails_for_user_id(&self.inner, user_id).await
    }

    async fn create_email_callback_code(&self, user_id: i64, email: &str) -> Result<String> {
        let result = self.inner.create_email_callback_code(user_id, email).await;
        if result.is_ok() {
            USER_EMAILS_CACHE.remove(&user_id);
        }
        result
    }

    async fn verify_email_callback_code(&self, code: &str) -> Result<()> {
        let result = self.inner.verify_email_callback_code(code).await;
        if result.is_ok() {
            USER_EMAILS_CACHE.clear();
        }
        result
    }

    async fn delete_email(&self, user_id: i64, email: &str) -> Result<()> {
        let result = self.inner.delete_email(user_id, email).await;
        if result.is_ok() {
            USER_EMAILS_CACHE.remove(&user_id);
        }
        result
    }

    async fn get_user_divisions(&self, user_id: i64) -> Result<Vec<i64>> {
        get_user_divisions(&self.inner, user_id).await
    }

    async fn set_user_division(
        &self,
        user_id: i64,
        team_id: i64,
        division_id: i64,
        join: bool,
    ) -> Result<()> {
        let result = self
            .inner
            .set_user_division(user_id, team_id, division_id, join)
            .await;
        if result.is_ok() {
            USER_DIVISIONS.remove(&user_id);
            TEAM_DIVISIONS.remove(&team_id);
            TEAM_STANDINGS.clear();
            SCOREBOARD_CACHE.clear();
            LEADERBOARD_CACHE.clear();
            *CHALLENGES_CACHE.write().await = None;
        }
        result
    }

    async fn insert_divisions(&self, divisions: &[Division]) -> Result<()> {
        let result = self.inner.insert_divisions(divisions).await;
        if result.is_ok() {
            USER_DIVISIONS.clear();
            TEAM_DIVISIONS.clear();
        }
        result
    }

    async fn get_team_divisions(&self, team_id: i64) -> Result<Vec<i64>> {
        get_team_divisions(&self.inner, team_id).await
    }

    async fn set_team_division(&self, team_id: i64, division_id: i64, join: bool) -> Result<()> {
        let result = self
            .inner
            .set_team_division(team_id, division_id, join)
            .await;
        if result.is_ok() {
            TEAM_DIVISIONS.remove(&team_id);
            TEAM_STANDINGS.clear();
            SCOREBOARD_CACHE.clear();
            LEADERBOARD_CACHE.clear();
            *CHALLENGES_CACHE.write().await = None;
        }
        result
    }

    async fn get_team_standings(&self, team_id: i64) -> Result<TeamStandings> {
        get_team_standing(&self.inner, team_id).await
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

pub type Writeups = BTreeMap<i64, Writeup>;

lazy_static::lazy_static! {
    pub static ref USER_WRITEUP_CACHE: DashMap<i64, TimedCache<Writeups>> = DashMap::new();
}

pub async fn get_writeups_from_user_id(db: &Connection, user_id: i64) -> Result<Writeups> {
    if let Some(writeups) = USER_WRITEUP_CACHE.get(&user_id) {
        return Ok(writeups.value.clone());
    }
    tracing::trace!(user_id, "cache miss: get_writeups_from_user_id");

    let writeups = db.get_writeups_from_user_id(user_id).await;

    if let Ok(writeups) = &writeups {
        USER_WRITEUP_CACHE.insert(user_id, TimedCache::new(writeups.clone()));
    }
    writeups
}

lazy_static::lazy_static! {
    pub static ref SCOREBOARD_CACHE: DashMap<i64, Scoreboard> = DashMap::new();
}

pub async fn get_scoreboard(db: &Connection, division_id: i64) -> Result<Scoreboard> {
    if let Some(scoreboard) = SCOREBOARD_CACHE.get(&division_id) {
        return Ok(scoreboard.clone());
    }
    tracing::trace!(division_id, "cache miss: get_scoreboard");

    let scoreboard = db.get_scoreboard(division_id).await;

    if let Ok(scoreboard) = &scoreboard {
        SCOREBOARD_CACHE.insert(division_id, scoreboard.clone());
    }
    scoreboard
}

lazy_static::lazy_static! {
    pub static ref LEADERBOARD_CACHE: DashMap<(i64, u64), Leaderboard> = DashMap::new();
}

pub async fn get_leaderboard(db: &Connection, division_id: i64, page: u64) -> Result<Leaderboard> {
    if let Some(leaderboard) = LEADERBOARD_CACHE.get(&(division_id, page)) {
        return Ok(leaderboard.clone());
    }
    tracing::trace!(division_id, page, "cache miss: get_leaderboard");

    let leaderboard = db.get_leaderboard(division_id, page).await;

    if let Ok(leaderboard) = &leaderboard {
        LEADERBOARD_CACHE.insert((division_id, page), leaderboard.clone());
    }
    leaderboard
}

lazy_static::lazy_static! {
    pub static ref USER_EMAILS_CACHE: DashMap<i64, TimedCache<Vec<Email>>> = DashMap::new();
}

pub async fn get_emails_for_user_id(db: &Connection, user_id: i64) -> Result<Vec<Email>> {
    if let Some(emails) = USER_EMAILS_CACHE.get(&user_id) {
        return Ok(emails.value.clone());
    }
    tracing::trace!(user_id, "cache miss: get_emails_for_user_id");

    let emails = db.get_emails_for_user_id(user_id).await;

    if let Ok(emails) = &emails {
        USER_EMAILS_CACHE.insert(user_id, TimedCache::new(emails.clone()));
    }
    emails
}

lazy_static::lazy_static! {
    pub static ref USER_DIVISIONS: DashMap<i64, TimedCache<Vec<i64>>> = DashMap::new();
}

pub async fn get_user_divisions(db: &Connection, user_id: i64) -> Result<Vec<i64>> {
    if let Some(divisions) = USER_DIVISIONS.get(&user_id) {
        return Ok(divisions.value.clone());
    }
    tracing::trace!(user_id, "cache miss: get_user_divisions");

    let divisions = db.get_user_divisions(user_id).await;

    if let Ok(divisions) = &divisions {
        USER_DIVISIONS.insert(user_id, TimedCache::new(divisions.clone()));
    }
    divisions
}

lazy_static::lazy_static! {
    pub static ref TEAM_DIVISIONS: DashMap<i64, TimedCache<Vec<i64>>> = DashMap::new();
}

pub async fn get_team_divisions(db: &Connection, team_id: i64) -> Result<Vec<i64>> {
    if let Some(divisions) = TEAM_DIVISIONS.get(&team_id) {
        return Ok(divisions.value.clone());
    }
    tracing::trace!(team_id, "cache miss: get_team_divisions");

    let divisions = db.get_team_divisions(team_id).await;

    if let Ok(divisions) = &divisions {
        TEAM_DIVISIONS.insert(team_id, TimedCache::new(divisions.clone()));
    }
    divisions
}

lazy_static::lazy_static! {
    pub static ref TEAM_STANDINGS: DashMap<i64, TimedCache<TeamStandings>> = DashMap::new();
}

pub async fn get_team_standing(db: &Connection, team_id: i64) -> Result<TeamStandings> {
    if let Some(standings) = TEAM_STANDINGS.get(&team_id) {
        return Ok(standings.value.clone());
    }
    tracing::trace!(team_id, "cache miss: get_team_standing");

    let standings = db.get_team_standings(team_id).await;

    if let Ok(standings) = &standings {
        TEAM_STANDINGS.insert(team_id, TimedCache::new(standings.clone()));
    }
    standings
}

pub fn database_cache_evictor(seconds: u64) {
    tokio::task::spawn(async move {
        let duration = Duration::from_secs(seconds);
        loop {
            tokio::time::sleep(duration).await;
            let evict_threshold = (chrono::Utc::now() - duration).timestamp();

            // User cache
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

            // Team cache
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

            // User writeup cache
            let mut count: i64 = 0;
            USER_WRITEUP_CACHE.retain(|_, v| {
                if v.insert_timestamp > evict_threshold {
                    true
                } else {
                    count += 1;
                    false
                }
            });
            if count > 0 {
                tracing::trace!(count, "Evicted user writeup cache");
            }

            // Scoreboard cache
            let mut count: i64 = 0;
            SCOREBOARD_CACHE.retain(|_, _| {
                count += 1;
                false
            });
            if count > 0 {
                tracing::trace!(count, "Evicted scoreboard cache");
            }

            // Leaderboard cache
            let mut count: i64 = 0;
            LEADERBOARD_CACHE.retain(|_, _| {
                count += 1;
                false
            });
            if count > 0 {
                tracing::trace!(count, "Evicted leaderboard cache");
            }

            // User emails cache
            let mut count: i64 = 0;
            USER_EMAILS_CACHE.retain(|_, v| {
                if v.insert_timestamp > evict_threshold {
                    true
                } else {
                    count += 1;
                    false
                }
            });
            if count > 0 {
                tracing::trace!(count, "Evicted user emails cache");
            }

            // User divisions cache
            let mut count: i64 = 0;
            USER_DIVISIONS.retain(|_, v| {
                if v.insert_timestamp > evict_threshold {
                    true
                } else {
                    count += 1;
                    false
                }
            });
            if count > 0 {
                tracing::trace!(count, "Evicted user divisions cache");
            }

            // Team divisions cache
            let mut count: i64 = 0;
            TEAM_DIVISIONS.retain(|_, v| {
                if v.insert_timestamp > evict_threshold {
                    true
                } else {
                    count += 1;
                    false
                }
            });
            if count > 0 {
                tracing::trace!(count, "Evicted team divisions cache");
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
