use std::{
    collections::{btree_map::Entry, BTreeMap},
    future::Future,
    net::IpAddr,
    num::NonZeroU64,
    path::Path,
    pin::Pin,
    sync::Arc,
    time::Duration,
};

use argon2::{password_hash::SaltString, Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use async_trait::async_trait;
use chrono::{DateTime, TimeZone, Utc};
use futures::stream::StreamExt;
use inflector::{cases::titlecase::to_title_case, string::pluralize::to_plural};
use libsql::{de, params, Builder, Transaction};
use rand::{rngs::OsRng, Rng};
use rust_embed::RustEmbed;
use serde::Deserialize;
use tokio_util::bytes::Bytes;

use crate::{
    internal::{
        auth::{User, UserInner},
        database::{
            cache::Writeups,
            provider::{
                Author, Category, Challenge, ChallengeAttachment, ChallengeData, ChallengeDivision,
                ChallengeDivisionPoints, ChallengeSolve, Challenges, Database, Email, FirstBloods,
                Leaderboard, LeaderboardEntry, Scoreboard, ScoreboardSeriesPoint, ScoreboardTeam,
                SetAccountNameError, SetTeamNameError, SiteStatistics, StatisticsCategory, Team,
                TeamInner, TeamMeta, TeamMetaInner, TeamStandingEntry, TeamStandings, TeamUser,
                Ticket, Writeup,
            },
        },
        division::Division,
        routes::{account::generate_email_callback_code, team::create_team_invite_token},
        settings::Settings,
    },
    Result,
};

#[derive(Clone)]
pub struct LocalLibSQL {
    pub conn: libsql::Connection,
}

impl LocalLibSQL {
    pub async fn new_local(path: impl AsRef<Path>) -> Result<LocalLibSQL> {
        let db = Builder::new_local(path).build().await?;
        let conn = db.connect()?;
        Ok(LocalLibSQL { conn })
    }

    pub async fn new_memory() -> Result<LocalLibSQL> {
        let db = Builder::new_local(":memory:").build().await?;
        let conn = db.connect()?;
        Ok(LocalLibSQL { conn })
    }
}

impl LibSQLConnection for LocalLibSQL {
    fn connect(&self) -> Result<libsql::Connection> {
        Ok(self.conn.to_owned())
    }
}

impl TryFrom<libsql::Database> for LocalLibSQL {
    type Error = crate::errors::RhombusError;

    fn try_from(db: libsql::Database) -> Result<Self> {
        let conn = db.connect()?;
        Ok(LocalLibSQL { conn })
    }
}

impl From<libsql::Connection> for LocalLibSQL {
    fn from(conn: libsql::Connection) -> Self {
        LocalLibSQL { conn }
    }
}

pub struct RemoteLibSQL {
    pub db: Arc<libsql::Database>,
}

impl RemoteLibSQL {
    pub async fn new_remote(url: String, auth_token: String) -> Result<Self> {
        let db = Builder::new_remote(url, auth_token).build().await?;
        Ok(Self { db: Arc::new(db) })
    }

    pub async fn new_remote_replica(
        path: impl AsRef<Path>,
        url: String,
        auth_token: String,
    ) -> Result<Self> {
        let db = Builder::new_remote_replica(path, url, auth_token)
            .sync_interval(Duration::from_secs(60))
            .build()
            .await?;
        Ok(Self { db: Arc::new(db) })
    }
}

impl From<Arc<libsql::Database>> for RemoteLibSQL {
    fn from(db: Arc<libsql::Database>) -> Self {
        RemoteLibSQL { db }
    }
}

impl LibSQLConnection for RemoteLibSQL {
    fn connect(&self) -> Result<libsql::Connection> {
        Ok(self.db.connect()?)
    }
}

pub trait LibSQLConnection {
    fn connect(&self) -> Result<libsql::Connection>;
    fn transaction(&self) -> Pin<Box<dyn Future<Output = Result<libsql::Transaction>> + Send>> {
        let conn = self.connect();
        Box::pin(async move {
            let conn = conn?;
            let mut count = 0;
            loop {
                match conn.transaction().await {
                    Ok(tx) => {
                        return Ok(tx);
                    }
                    Err(e) => {
                        count += 1;
                        if count > 5 {
                            return Err(crate::errors::RhombusError::LibSQL(e));
                        }
                        tokio::time::sleep(Duration::from_millis(10)).await;
                    }
                }
            }
        })
    }
}

pub enum LibSQL {
    Local(LocalLibSQL),
    Remote(RemoteLibSQL),
}

impl LibSQLConnection for LibSQL {
    fn connect(&self) -> Result<libsql::Connection> {
        match self {
            LibSQL::Local(local) => local.connect(),
            LibSQL::Remote(remote) => remote.connect(),
        }
    }
}

impl From<LocalLibSQL> for LibSQL {
    fn from(local: LocalLibSQL) -> Self {
        LibSQL::Local(local)
    }
}

impl From<RemoteLibSQL> for LibSQL {
    fn from(remote: RemoteLibSQL) -> Self {
        LibSQL::Remote(remote)
    }
}

#[derive(RustEmbed)]
#[folder = "migrations/libsql"]
struct Migrations;

#[async_trait]
impl<T: LibSQLConnection + Send + Sync> Database for T {
    async fn migrate(&self) -> Result<()> {
        self.connect()?
            .execute_batch(
                std::str::from_utf8(Migrations::get("0001_setup.up.sql").unwrap().data.as_ref())
                    .unwrap(),
            )
            .await?;
        Ok(())
    }

    async fn upsert_user_by_discord_id(
        &self,
        name: &str,
        email: &str,
        avatar: &str,
        discord_id: NonZeroU64,
        user_id: Option<i64>,
    ) -> Result<(i64, i64)> {
        let tx = self.transaction().await?;

        let existing_user = if let Some(user_id) = user_id {
            let team_id = tx
                .query(
                    "
                    UPDATE rhombus_user
                    SET name = ?1, avatar = ?2, discord_id = ?3
                    WHERE id = ?4
                    RETURNING team_id
                ",
                    params!(name, avatar, discord_id.get(), user_id),
                )
                .await?
                .next()
                .await?
                .unwrap()
                .get::<i64>(0)
                .unwrap();
            Some((user_id, team_id))
        } else {
            tx.query(
                "
                    UPDATE rhombus_user
                    SET name = ?1, avatar = ?2
                    WHERE discord_id = ?3
                    RETURNING id, team_id
                ",
                params!(name, avatar, discord_id.get()),
            )
            .await?
            .next()
            .await?
            .map(|row| (row.get::<i64>(0).unwrap(), row.get::<i64>(1).unwrap()))
        };

        if let Some(existing_user) = existing_user {
            tx.execute(
                "INSERT OR REPLACE INTO rhombus_email (email, user_id) VALUES (?1, ?2)",
                params!(email, existing_user.0),
            )
            .await?;

            tx.commit().await?;
            return Ok(existing_user);
        }

        let team_id = create_team(&tx).await?;

        let user_id = tx
            .query(
                "INSERT INTO rhombus_user (name, avatar, discord_id, team_id, owner_team_id) VALUES (?1, ?2, ?3, ?4, ?4) RETURNING id",
                params!(name, avatar, discord_id.get(), team_id),
            )
            .await?
            .next()
            .await?
            .unwrap()
            .get::<i64>(0)
            .unwrap();

        tx.execute(
            "INSERT INTO rhombus_email (email, user_id) VALUES (?1, ?2)",
            params!(email, user_id),
        )
        .await?;

        tx.commit().await?;
        return Ok((user_id, team_id));
    }

    async fn upsert_user_by_email(
        &self,
        name: &str,
        email: &str,
        avatar: &str,
    ) -> Result<(i64, i64)> {
        let tx = self.transaction().await?;

        let existing_user = tx
            .query(
                "
                SELECT user_id, team_id
                FROM rhombus_email JOIN rhombus_user ON rhombus_user.id = rhombus_email.user_id
                WHERE
                    email = ?1 AND
                    code IS NULL
                ",
                [email],
            )
            .await?
            .next()
            .await?
            .map(|row| (row.get::<i64>(0).unwrap(), row.get::<i64>(1).unwrap()));
        if let Some(existing_user) = existing_user {
            tx.commit().await?;
            return Ok(existing_user);
        }

        let team_id = create_team(&tx).await?;

        let user_id = tx
            .query(
                "INSERT INTO rhombus_user (name, avatar, team_id, owner_team_id) VALUES (?1, ?2, ?3, ?3) RETURNING id",
                params!(name, avatar, team_id),
            )
            .await?
            .next()
            .await?
            .unwrap()
            .get::<i64>(0)
            .unwrap();

        tx.execute(
            "INSERT INTO rhombus_email (email, user_id) VALUES (?1, ?2)",
            params!(email, user_id),
        )
        .await?;

        tx.commit().await?;

        return Ok((user_id, team_id));
    }

    async fn upsert_user_by_credentials(
        &self,
        username: &str,
        avatar: &str,
        password: &str,
    ) -> Result<Option<(i64, i64)>> {
        let tx = self.transaction().await?;

        #[derive(Debug, Deserialize)]
        struct QueryUser {
            id: i64,
            team_id: i64,
            password: String,
        }

        let existing_user = tx
            .query(
                "
                SELECT id, team_id, password
                FROM rhombus_user
                WHERE name = ?1
            ",
                [username],
            )
            .await?
            .next()
            .await?
            .map(|row| de::from_row::<QueryUser>(&row).unwrap());

        if let Some(existing_user) = existing_user {
            let parsed_hash = PasswordHash::new(&existing_user.password)?;

            tx.commit().await?;

            if Argon2::default()
                .verify_password(password.as_bytes(), &parsed_hash)
                .is_ok()
            {
                Ok(Some((existing_user.id, existing_user.team_id)))
            } else {
                Ok(None)
            }
        } else {
            let team_id = create_team(&tx).await?;

            let salt = SaltString::generate(&mut OsRng);
            let argon2 = Argon2::default();
            let hashed_password = argon2
                .hash_password(password.as_bytes(), &salt)?
                .to_string();

            let user_id = tx
                .query(
                    "INSERT INTO rhombus_user (name, password, avatar, team_id, owner_team_id) VALUES (?1, ?2, ?3, ?4, ?4) RETURNING id",
                    params!(username, hashed_password, avatar, team_id),
                )
                .await?
                .next()
                .await?
                .unwrap()
                .get::<i64>(0)
                .unwrap();

            tx.commit().await?;
            return Ok(Some((user_id, team_id)));
        }
    }

    async fn upsert_user_by_ctftime(
        &self,
        name: &str,
        email: &str,
        avatar: &str,
        ctftime_user_id: i64,
        ctftime_team_id: i64,
        team_name: &str,
    ) -> Result<(i64, i64, Option<String>)> {
        let tx = self.transaction().await?;

        #[derive(Debug, Deserialize)]
        struct QueryUser {
            user_id: i64,
            team_id: i64,
            team_ctftime_id: i64,
        }

        let existing_user = tx
            .query(
                "
                SELECT rhombus_user.id AS user_id, rhombus_user.team_id, rhombus_team.ctftime_id AS team_ctftime_id
                FROM rhombus_user JOIN rhombus_team ON rhombus_user.team_id = rhombus_team.id
                WHERE rhombus_user.ctftime_id = ?1
            ",
                [ctftime_user_id],
            )
            .await?
            .next()
            .await?
            .map(|row| de::from_row::<QueryUser>(&row).unwrap());

        if let Some(ref existing_user) = existing_user {
            if existing_user.team_ctftime_id == ctftime_team_id {
                // if the user exists and is on the team, just auth in
                tx.commit().await?;
                return Ok((existing_user.user_id, existing_user.team_id, None));
            }
        }

        #[derive(Debug, Deserialize)]
        struct QueryTeam {
            invite_token: String,
        }

        let existing_team = tx
            .query(
                "
                    SELECT invite_token
                    FROM rhombus_team
                    WHERE ctftime_id = ?1
                ",
                [ctftime_team_id],
            )
            .await?
            .next()
            .await?
            .map(|row| de::from_row::<QueryTeam>(&row).unwrap());

        if let Some(existing_team) = existing_team {
            if let Some(ref existing_user) = existing_user {
                // if the team exists and the user exists, but the user is not on the team, add the user to the team
                tx.commit().await?;
                return Ok((
                    existing_user.user_id,
                    existing_user.team_id,
                    Some(existing_team.invite_token),
                ));
            }

            let scratch_team_id = create_team(&tx).await?;

            let user_id = tx
                .query(
                    "INSERT INTO rhombus_user (name, avatar, ctftime_id, team_id, owner_team_id) VALUES (?1, ?2, ?3, ?4, ?4) RETURNING id",
                    params!(name, avatar, ctftime_user_id, scratch_team_id),
                )
                .await?
                .next()
                .await?
                .unwrap()
                .get::<i64>(0)
                .unwrap();

            tx.execute(
                "INSERT INTO rhombus_email (email, user_id) VALUES (?1, ?2)",
                params!(email, user_id),
            )
            .await?;

            tx.commit().await?;
            return Ok((user_id, scratch_team_id, Some(existing_team.invite_token)));
        }

        // if the team does not exist, create the team and add the user to the team

        let team_invite_token = create_team_invite_token();

        let team_id = tx
            .query(
                "INSERT INTO rhombus_team (name, invite_token, ctftime_id) VALUES (?1, ?2, ?3) RETURNING id",
                params!(team_name, team_invite_token.as_str(), ctftime_team_id),
            )
            .await?
            .next()
            .await?
            .unwrap()
            .get::<i64>(0)?;

        let user_id = tx
            .query(
                "INSERT INTO rhombus_user (name, avatar, ctftime_id, team_id, owner_team_id) VALUES (?1, ?2, ?3, ?4, ?4) RETURNING id",
                params!(name, avatar, ctftime_user_id, team_id),
            )
            .await?
            .next()
            .await?
            .unwrap()
            .get::<i64>(0)
            .unwrap();

        tx.execute(
            "INSERT INTO rhombus_email (email, user_id) VALUES (?1, ?2)",
            params!(email, user_id),
        )
        .await?;

        tx.commit().await?;
        Ok((user_id, team_id, None))
    }

    async fn insert_track(
        &self,
        ip: IpAddr,
        user_agent: Option<&str>,
        user_id: Option<i64>,
        requests: u64,
    ) -> Result<()> {
        let ip = match ip {
            IpAddr::V4(ip) => ip.to_ipv6_mapped(),
            IpAddr::V6(ip) => ip,
        }
        .octets();

        let track_id = self
            .connect()?
            .query(
                "
            INSERT INTO rhombus_track (ip, user_agent, requests) VALUES (?1, ?2, ?3)
            ON CONFLICT (ip, user_agent) DO
                UPDATE SET
                    last_seen_at = strftime('%s', 'now'),
                    requests = rhombus_track.requests + ?3
            RETURNING id
            ",
                params!(ip, user_agent.unwrap_or(""), requests),
            )
            .await?
            .next()
            .await?
            .unwrap()
            .get::<i64>(0)
            .unwrap();

        if let Some(user_id) = user_id {
            self.connect()?
                .execute(
                    "
                    INSERT INTO rhombus_track_ip (user_id, track_id) VALUES (?1, ?2)
                    ON CONFLICT (user_id, track_id) DO NOTHING
                ",
                    [user_id, track_id],
                )
                .await
                .unwrap();
        }

        Ok(())
    }

    async fn get_challenges(&self) -> Result<Challenges> {
        let tx = self.transaction().await?;

        let rhombus_challenge_division_points = tx
            .query(
                "
                SELECT *
                FROM rhombus_challenge_division_points
            ",
                (),
            )
            .await?
            .into_stream()
            .map(|row| de::from_row::<DbChallengeDivisionPoints>(&row.unwrap()).unwrap())
            .collect::<Vec<_>>()
            .await;
        #[derive(Debug, Deserialize)]
        struct DbChallengeDivisionPoints {
            challenge_id: i64,
            division_id: i64,
            points: f64,
            solves: f64,
        }
        let mut dbps = BTreeMap::new();
        for d in rhombus_challenge_division_points.into_iter() {
            let elem = ChallengeDivisionPoints {
                division_id: d.division_id,
                points: d.points as u64,
                solves: d.solves as u64,
            };
            match dbps.get_mut(&d.challenge_id) {
                None => _ = dbps.insert(d.challenge_id, vec![elem]),
                Some(ps) => ps.push(elem),
            }
        }

        let mut query_challenges = tx
            .query(
                "
                SELECT *
                FROM rhombus_file_attachment
            ",
                (),
            )
            .await?;
        #[derive(Debug, Deserialize)]
        struct QueryChallengeFileAttachment {
            challenge_id: i64,
            name: String,
            url: String,
        }
        let mut attachments = BTreeMap::new();
        while let Some(row) = query_challenges.next().await? {
            let query_attachment = de::from_row::<QueryChallengeFileAttachment>(&row).unwrap();
            let attachment = ChallengeAttachment {
                name: query_attachment.name,
                url: query_attachment.url,
            };
            match attachments.get_mut(&query_attachment.challenge_id) {
                None => _ = attachments.insert(query_attachment.challenge_id, vec![attachment]),
                Some(ws) => ws.push(attachment),
            };
        }

        let challenge_rows = tx
            .query(
                "
                SELECT rhombus_challenge.*, COUNT(rhombus_solve.challenge_id) AS solves_count
                FROM rhombus_challenge
                LEFT JOIN rhombus_solve ON rhombus_challenge.id = rhombus_solve.challenge_id
                GROUP BY rhombus_challenge.id
            ",
                (),
            )
            .await?;
        #[derive(Debug, Deserialize)]
        struct DbChallenge {
            id: i64,
            name: String,
            description: String,
            category_id: i64,
            author_id: i64,
            healthy: Option<bool>,
            healthscript: Option<String>,
            last_healthcheck: Option<i64>,
            flag: String,
            score_type: i64,
            ticket_template: Option<String>,
        }
        let challenges = challenge_rows
            .into_stream()
            .map(|row| de::from_row::<DbChallenge>(&row.unwrap()).unwrap())
            .map(|challenge| Challenge {
                id: challenge.id,
                name: challenge.name,
                description: challenge.description,
                category_id: challenge.category_id,
                author_id: challenge.author_id,
                healthy: challenge.healthy,
                healthscript: challenge.healthscript,
                last_healthcheck: challenge
                    .last_healthcheck
                    .map(|t| Utc.timestamp_opt(t, 0).unwrap()),
                flag: challenge.flag,
                scoring_type: challenge.score_type.into(),
                division_points: dbps.get(&challenge.id).unwrap_or(&vec![]).to_vec(),
                ticket_template: challenge.ticket_template,
                attachments: attachments.get(&challenge.id).unwrap_or(&vec![]).to_vec(),
            })
            .collect::<Vec<Challenge>>()
            .await;

        let category_rows = tx.query("SELECT * FROM rhombus_category", ()).await?;
        #[derive(Debug, Deserialize)]
        struct DbCategory {
            id: i64,
            name: String,
            color: String,
        }
        let categories = category_rows
            .into_stream()
            .map(|row| de::from_row::<DbCategory>(&row.unwrap()).unwrap())
            .map(|category| Category {
                id: category.id,
                name: category.name,
                color: category.color,
            })
            .collect::<Vec<Category>>()
            .await;

        let mut author_rows = tx.query("SELECT * FROM rhombus_author", ()).await?;
        #[derive(Debug, Deserialize)]
        struct DbAuthor {
            id: i64,
            name: String,
            avatar: String,
            discord_id: NonZeroU64,
        }
        let mut authors: BTreeMap<i64, Author> = Default::default();
        while let Some(row) = author_rows.next().await? {
            let query_author = de::from_row::<DbAuthor>(&row).unwrap();
            authors.insert(
                query_author.id,
                Author {
                    name: query_author.name,
                    avatar_url: query_author.avatar,
                    discord_id: query_author.discord_id,
                },
            );
        }

        let mut division_rows = tx.query("SELECT * FROM rhombus_division", ()).await?;
        #[derive(Debug, Deserialize)]
        struct DbDivision {
            id: i64,
            name: String,
        }
        let mut divisions: BTreeMap<i64, ChallengeDivision> = Default::default();
        while let Some(row) = division_rows.next().await? {
            let query_division = de::from_row::<DbDivision>(&row).unwrap();
            divisions.insert(
                query_division.id,
                ChallengeDivision {
                    name: query_division.name,
                },
            );
        }

        tx.commit().await?;

        Ok(Arc::new(ChallengeData {
            challenges,
            categories,
            authors,
            divisions,
        }))
    }

    async fn set_challenge_health(
        &self,
        challenge_id: i64,
        healthy: Option<bool>,
        checked_at: DateTime<Utc>,
    ) -> Result<()> {
        self.connect()?
            .execute(
                "UPDATE rhombus_challenge SET healthy = ?2, last_healthcheck = ?3 WHERE id = ?1",
                params!(challenge_id, healthy, checked_at.timestamp()),
            )
            .await?;

        Ok(())
    }

    async fn get_team_meta_from_invite_token(
        &self,
        invite_token: &str,
    ) -> Result<Option<TeamMeta>> {
        #[derive(Debug, Deserialize)]
        struct DbTeam {
            id: i64,
            name: String,
        }
        let team = self
            .connect()?
            .query(
                "SELECT id, name FROM rhombus_team WHERE invite_token = ?",
                [invite_token],
            )
            .await?
            .next()
            .await?;

        if let Some(row) = &team {
            let team = de::from_row::<DbTeam>(row).unwrap();
            Ok(Some(Arc::new(TeamMetaInner {
                id: team.id,
                name: team.name,
            })))
        } else {
            Ok(None)
        }
    }

    async fn get_team_from_id(&self, team_id: i64) -> Result<Team> {
        let tx = self.transaction().await?;

        #[derive(Debug, Deserialize)]
        struct QueryTeam {
            name: String,
            invite_token: String,
        }
        let query_team_row = tx
            .query(
                "SELECT name, invite_token FROM rhombus_team WHERE id = ?1",
                [team_id],
            )
            .await?
            .next()
            .await?
            .ok_or(libsql::Error::QueryReturnedNoRows)?;
        let query_team = de::from_row::<QueryTeam>(&query_team_row).unwrap();

        #[derive(Debug, Deserialize)]
        struct QueryTeamUser {
            id: i64,
            name: String,
            avatar: String,
            discord_id: Option<NonZeroU64>,
            owner_team_id: i64,
        }
        let mut query_user_rows = tx
            .query(
                "SELECT id, name, avatar, discord_id, owner_team_id FROM rhombus_user WHERE team_id = ?1",
                [team_id],
            )
            .await?;
        let mut users: BTreeMap<i64, TeamUser> = Default::default();
        while let Some(row) = query_user_rows.next().await? {
            let query_user = de::from_row::<QueryTeamUser>(&row).unwrap();
            users.insert(
                query_user.id,
                TeamUser {
                    name: query_user.name,
                    avatar_url: query_user.avatar,
                    discord_id: query_user.discord_id,
                    is_team_owner: query_user.owner_team_id == team_id,
                },
            );
        }

        #[derive(Debug, Deserialize)]
        struct QuerySolve {
            pub challenge_id: i64,
            pub user_id: i64,
            pub solved_at: i64,
        }
        let mut query_solves = tx
            .query(
                "
                SELECT challenge_id, user_id, solved_at
                FROM rhombus_solve
                WHERE team_id = ?1
            ",
                [team_id],
            )
            .await?;
        let mut solves: BTreeMap<i64, ChallengeSolve> = Default::default();
        while let Some(row) = query_solves.next().await? {
            let query_solve = de::from_row::<QuerySolve>(&row).unwrap();
            let solve = ChallengeSolve {
                user_id: query_solve.user_id,
                solved_at: DateTime::<Utc>::from_timestamp(query_solve.solved_at, 0).unwrap(),
            };

            // favor the earliest solve
            if match solves.entry(query_solve.challenge_id) {
                Entry::Occupied(old) => solve < *old.get(),
                Entry::Vacant(_) => true,
            } {
                solves.insert(query_solve.challenge_id, solve);
            }
        }

        #[derive(Debug, Deserialize)]
        struct QueryWriteup {
            pub user_id: i64,
            pub challenge_id: i64,
            pub url: String,
        }
        let mut query_writeups = tx
            .query(
                "
                SELECT user_id, challenge_id, url
                FROM rhombus_writeup
                WHERE user_id IN (
                    SELECT id
                    FROM rhombus_user
                    WHERE team_id = ?1
                )
            ",
                [team_id],
            )
            .await?;
        let mut writeups = BTreeMap::new();
        while let Some(row) = query_writeups.next().await? {
            let query_writeup = de::from_row::<QueryWriteup>(&row).unwrap();
            let writeup = Writeup {
                url: query_writeup.url,
                user_id: query_writeup.user_id,
            };
            match writeups.get_mut(&query_writeup.challenge_id) {
                None => _ = writeups.insert(query_writeup.challenge_id, vec![writeup]),
                Some(ws) => ws.push(writeup),
            };
        }

        tx.commit().await?;

        Ok(Arc::new(TeamInner {
            id: team_id,
            name: query_team.name,
            invite_token: query_team.invite_token,
            users,
            solves,
            writeups,
        }))
    }

    async fn add_user_to_team(
        &self,
        user_id: i64,
        team_id: i64,
        _old_team_id: Option<i64>,
    ) -> Result<()> {
        let tx = self.transaction().await?;

        tx.execute(
            "
                UPDATE rhombus_user
                SET team_id = ?2
                WHERE id = ?1
            ",
            [user_id, team_id],
        )
        .await?;

        tx.execute(
            "
                UPDATE rhombus_solve
                SET team_id = ?2
                WHERE user_id = ?1
            ",
            [user_id, team_id],
        )
        .await?;

        tx.commit().await?;
        Ok(())
    }

    async fn get_user_from_id(&self, user_id: i64) -> Result<User> {
        #[derive(Debug, Deserialize)]
        struct DbUser {
            id: i64,
            name: String,
            avatar: String,
            discord_id: Option<NonZeroU64>,
            team_id: i64,
            owner_team_id: i64,
            disabled: bool,
            is_admin: bool,
        }

        let row = self
            .connect()?
            .query("SELECT * FROM rhombus_user WHERE id = ?1", [user_id])
            .await?
            .next()
            .await?
            .ok_or(libsql::Error::QueryReturnedNoRows)?;

        let user = de::from_row::<DbUser>(&row).unwrap();
        Ok(Arc::new(UserInner {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            discord_id: user.discord_id,
            disabled: user.disabled,
            is_admin: user.is_admin,
            team_id: user.team_id,
            is_team_owner: user.team_id == user.owner_team_id,
        }))
    }

    async fn get_user_from_discord_id(&self, discord_id: NonZeroU64) -> Result<User> {
        #[derive(Debug, Deserialize)]
        struct DbUser {
            id: i64,
            name: String,
            avatar: String,
            discord_id: Option<NonZeroU64>,
            team_id: i64,
            owner_team_id: i64,
            disabled: bool,
            is_admin: bool,
        }

        let row = self
            .connect()?
            .query(
                "SELECT * FROM rhombus_user WHERE discord_id = ?1",
                [discord_id.get()],
            )
            .await?
            .next()
            .await?
            .ok_or(libsql::Error::QueryReturnedNoRows)?;

        let user = de::from_row::<DbUser>(&row).unwrap();
        Ok(Arc::new(UserInner {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            discord_id: user.discord_id,
            disabled: user.disabled,
            is_admin: user.is_admin,
            team_id: user.team_id,
            is_team_owner: user.team_id == user.owner_team_id,
        }))
    }

    async fn kick_user(&self, user_id: i64, _team_id: i64) -> Result<()> {
        self.connect()?
            .execute(
                "UPDATE rhombus_user SET team_id = owner_team_id WHERE id = ?1",
                [user_id],
            )
            .await?;
        Ok(())
    }

    async fn roll_invite_token(&self, team_id: i64) -> Result<String> {
        let new_invite_token = create_team_invite_token();

        self.connect()?
            .execute(
                "UPDATE rhombus_team SET invite_token = ?2 WHERE id = ?1",
                params!(team_id, new_invite_token.clone()),
            )
            .await?;

        Ok(new_invite_token)
    }

    async fn set_team_name(
        &self,
        team_id: i64,
        new_team_name: &str,
        timeout_seconds: u64,
    ) -> Result<std::result::Result<(), SetTeamNameError>> {
        let tx = self.transaction().await?;

        let last_change_timestamp = tx
            .query(
                "
                SELECT at
                FROM rhombus_team_historical_names
                WHERE team_id = ?1
                ORDER BY at DESC
                LIMIT 1
            ",
                [team_id],
            )
            .await?
            .next()
            .await?
            .map(|row| row.get::<i64>(0).unwrap());

        let last_change_date =
            DateTime::<Utc>::from_timestamp(last_change_timestamp.unwrap_or(0), 0).unwrap();

        let next_allowed = last_change_date + Duration::from_secs(timeout_seconds);
        if Utc::now() < next_allowed {
            return Ok(Err(SetTeamNameError::Timeout(next_allowed)));
        }

        tx.execute(
            "
            INSERT INTO rhombus_team_historical_names (team_id, name)
            SELECT ?1, name
            FROM rhombus_team
            WHERE id = ?1
            ",
            params!(team_id),
        )
        .await?;

        if tx
            .execute(
                "UPDATE rhombus_team SET name = ?2 WHERE id = ?1",
                params!(team_id, new_team_name),
            )
            .await
            .is_err()
        {
            return Ok(Err(SetTeamNameError::Taken));
        }

        tx.commit().await?;
        Ok(Ok(()))
    }

    async fn set_account_name(
        &self,
        user_id: i64,
        _team_id: i64,
        new_account_name: &str,
        timeout_seconds: u64,
    ) -> Result<std::result::Result<(), SetAccountNameError>> {
        let tx = self.transaction().await?;

        let last_change_timestamp = tx
            .query(
                "
                SELECT at
                FROM rhombus_user_historical_names
                WHERE user_id = ?1
                ORDER BY at DESC
                LIMIT 1
            ",
                [user_id],
            )
            .await?
            .next()
            .await?
            .map(|row| row.get::<i64>(0).unwrap());

        let last_change_date =
            DateTime::<Utc>::from_timestamp(last_change_timestamp.unwrap_or(0), 0).unwrap();

        let next_allowed = last_change_date + Duration::from_secs(timeout_seconds);
        if Utc::now() < next_allowed {
            return Ok(Err(SetAccountNameError::Timeout(next_allowed)));
        }

        tx.execute(
            "
            INSERT INTO rhombus_user_historical_names (user_id, name)
            SELECT ?1, name
            FROM rhombus_user
            WHERE id = ?1
            ",
            params!(user_id),
        )
        .await?;

        if tx
            .execute(
                "UPDATE rhombus_user SET name = ?2 WHERE id = ?1",
                params!(user_id, new_account_name),
            )
            .await
            .is_err()
        {
            return Ok(Err(SetAccountNameError::Taken));
        }

        tx.commit().await?;
        Ok(Ok(()))
    }

    async fn solve_challenge(
        &self,
        user_id: i64,
        team_id: i64,
        challenge: &Challenge,
    ) -> Result<FirstBloods> {
        let tx = self.transaction().await?;

        let now = chrono::Utc::now().timestamp();

        tx.execute(
            "INSERT INTO rhombus_solve (challenge_id, user_id, team_id, solved_at) VALUES (?1, ?2, ?3, ?4)",
            [challenge.id, user_id, team_id, now],
        )
        .await?;

        tx.execute(
            "
            INSERT INTO rhombus_points_snapshot
            SELECT team_id, division_id, ?1, points
            FROM rhombus_team_division_points
            WHERE division_id IN (
                SELECT division_id
                FROM rhombus_team_division
                WHERE team_id = ?2
            )
            ",
            [now, team_id],
        )
        .await?;

        let first_blood_division_ids = tx
            .query(
                "
                SELECT rhombus_team_division.division_id
                FROM rhombus_challenge_division_points
                JOIN rhombus_team_division ON
                    rhombus_team_division.division_id = rhombus_challenge_division_points.division_id AND
                    rhombus_team_division.team_id = ?2
                WHERE challenge_id = ?1 AND solves = 1
            ",
                [challenge.id, team_id],
            )
            .await?
            .into_stream()
            .map(|row| row.unwrap().get::<i64>(0).unwrap())
            .collect::<Vec<_>>()
            .await;

        tx.commit().await?;

        Ok(FirstBloods {
            division_ids: first_blood_division_ids,
        })
    }

    async fn add_writeup(
        &self,
        user_id: i64,
        _team_id: i64,
        challenge_id: i64,
        writeup_url: &str,
    ) -> Result<()> {
        self.connect()?
            .execute(
                "
                INSERT INTO rhombus_writeup (user_id, challenge_id, url) VALUES (?1, ?2, ?3)
            ",
                params!(user_id, challenge_id, writeup_url),
            )
            .await?;

        Ok(())
    }

    async fn get_writeups_from_user_id(&self, user_id: i64) -> Result<Writeups> {
        #[derive(Debug, Deserialize)]
        struct QueryWriteup {
            pub user_id: i64,
            pub challenge_id: i64,
            pub url: String,
        }
        let mut db_writeups = self
            .connect()?
            .query(
                "
                SELECT user_id, challenge_id, url
                FROM rhombus_writeup
                WHERE user_id = ?1
            ",
                [user_id],
            )
            .await?;
        let mut writeups = BTreeMap::new();
        while let Some(writeup) = db_writeups.next().await? {
            let writeup = de::from_row::<QueryWriteup>(&writeup).unwrap();
            writeups.insert(
                writeup.challenge_id,
                Writeup {
                    url: writeup.url,
                    user_id: writeup.user_id,
                },
            );
        }
        Ok(writeups)
    }

    async fn delete_writeup(&self, challenge_id: i64, user_id: i64, _team_id: i64) -> Result<()> {
        self.connect()?
            .execute(
                "
                DELETE FROM rhombus_writeup
                WHERE challenge_id = ?1 AND user_id = ?2
            ",
                [challenge_id, user_id],
            )
            .await?;

        Ok(())
    }

    async fn get_next_ticket_number(&self) -> Result<u64> {
        let ticket_number = self
            .connect()?
            .query(
                "
                UPDATE rhombus_ticket_number_counter
                SET ticket_number = ticket_number + 1
                WHERE rowid = 1
                RETURNING ticket_number
            ",
                (),
            )
            .await?
            .next()
            .await?
            .unwrap()
            .get::<u64>(0)
            .unwrap();

        Ok(ticket_number)
    }

    async fn create_ticket(
        &self,
        ticket_number: u64,
        user_id: i64,
        challenge_id: i64,
        discord_channel_id: NonZeroU64,
    ) -> Result<()> {
        self
            .connect()?
            .execute(
                "
                INSERT INTO rhombus_ticket (ticket_number, user_id, challenge_id, discord_channel_id) VALUES (?1, ?2, ?3, ?4)
            ",
                params!(ticket_number, user_id, challenge_id, discord_channel_id.get()),
            )
            .await?;

        Ok(())
    }

    async fn get_ticket_by_ticket_number(&self, ticket_number: u64) -> Result<Ticket> {
        #[derive(Debug, Deserialize)]
        struct DbTicket {
            pub user_id: i64,
            pub challenge_id: i64,
            pub closed_at: Option<i64>,
            pub discord_channel_id: NonZeroU64,
        }

        let tx = self.transaction().await?;

        let ticket_row = tx
            .query(
                "
                SELECT user_id, challenge_id, closed_at, discord_channel_id
                FROM rhombus_ticket
                WHERE ticket_number = ?1
            ",
                [ticket_number],
            )
            .await?
            .next()
            .await?;

        let db_ticket = de::from_row::<DbTicket>(&ticket_row.unwrap()).unwrap();

        #[derive(Debug, Deserialize)]
        struct DbTicketEmailMessageIdReference {
            pub message_id: String,
            pub user_sent: bool,
        }

        let email_references = tx
            .query(
                "
                SELECT message_id, user_sent
                FROM rhombus_ticket_email_message_id_reference
                WHERE ticket_number = ?1
            ",
                [ticket_number],
            )
            .await?
            .into_stream()
            .map(|row| de::from_row::<DbTicketEmailMessageIdReference>(&row.unwrap()).unwrap())
            .collect::<Vec<_>>()
            .await;

        tx.commit().await?;

        Ok(Ticket {
            ticket_number,
            user_id: db_ticket.user_id,
            challenge_id: db_ticket.challenge_id,
            closed_at: db_ticket
                .closed_at
                .map(|ts| DateTime::<Utc>::from_timestamp(ts, 0).unwrap()),
            discord_channel_id: db_ticket.discord_channel_id,
            email_in_reply_to: email_references
                .iter()
                .find(|r| !r.user_sent)
                .map(|r| r.message_id.clone()),
            email_references: email_references.into_iter().map(|r| r.message_id).collect(),
        })
    }

    async fn get_ticket_by_discord_channel_id(
        &self,
        discord_channel_id: NonZeroU64,
    ) -> Result<Ticket> {
        #[derive(Debug, Deserialize)]
        struct DbTicket {
            pub ticket_number: u64,
            pub user_id: i64,
            pub challenge_id: i64,
            pub closed_at: Option<i64>,
            pub discord_channel_id: NonZeroU64,
        }

        let tx = self.transaction().await?;

        let ticket_row = self
            .connect()?
            .query(
                "
                SELECT ticket_number, user_id, challenge_id, closed_at, discord_channel_id
                FROM rhombus_ticket
                WHERE discord_channel_id = ?1
            ",
                [discord_channel_id.get()],
            )
            .await?
            .next()
            .await?;

        let db_ticket = de::from_row::<DbTicket>(&ticket_row.unwrap()).unwrap();

        #[derive(Debug, Deserialize)]
        struct DbTicketEmailMessageIdReference {
            pub message_id: String,
            pub user_sent: bool,
        }

        let email_references = tx
            .query(
                "
                SELECT message_id, user_sent
                FROM rhombus_ticket_email_message_id_reference
                WHERE ticket_number = ?1
            ",
                [db_ticket.ticket_number],
            )
            .await?
            .into_stream()
            .map(|row| de::from_row::<DbTicketEmailMessageIdReference>(&row.unwrap()).unwrap())
            .collect::<Vec<_>>()
            .await;

        tx.commit().await?;

        Ok(Ticket {
            ticket_number: db_ticket.ticket_number,
            user_id: db_ticket.user_id,
            challenge_id: db_ticket.challenge_id,
            closed_at: db_ticket
                .closed_at
                .map(|ts| DateTime::<Utc>::from_timestamp(ts, 0).unwrap()),
            discord_channel_id: db_ticket.discord_channel_id,
            email_in_reply_to: email_references
                .iter()
                .find(|r| !r.user_sent)
                .map(|r| r.message_id.clone()),
            email_references: email_references.into_iter().map(|r| r.message_id).collect(),
        })
    }

    async fn close_ticket(&self, ticket_number: u64, time: DateTime<Utc>) -> Result<()> {
        self.connect()?
            .execute(
                "
                UPDATE rhombus_ticket
                SET closed_at = ?1
                WHERE ticket_number = ?2
            ",
                params!(time.timestamp(), ticket_number),
            )
            .await?;

        Ok(())
    }

    async fn reopen_ticket(&self, ticket_number: u64) -> Result<()> {
        self.connect()?
            .execute(
                "
                UPDATE rhombus_ticket
                SET closed_at = NULL
                WHERE ticket_number = ?1
            ",
                [ticket_number],
            )
            .await?;

        Ok(())
    }

    async fn add_email_message_id_to_ticket(
        &self,
        ticket_number: u64,
        message_id: &str,
        user_sent: bool,
    ) -> Result<()> {
        self.connect()?
            .execute(
                "
                INSERT INTO rhombus_ticket_email_message_id_reference (ticket_number, message_id, user_sent) VALUES (?1, ?2, ?3)
            ",
                params!(ticket_number, message_id, user_sent),
            )
            .await?;

        Ok(())
    }

    async fn get_ticket_number_by_message_id(&self, message_id: &str) -> Result<u64> {
        let ticket_number = self
            .connect()?
            .query(
                "
                SELECT ticket_number
                FROM rhombus_ticket_email_message_id_reference
                WHERE message_id = ?1
            ",
                [message_id],
            )
            .await?
            .next()
            .await?
            .unwrap()
            .get::<u64>(0)
            .unwrap();

        Ok(ticket_number)
    }

    async fn save_settings(&self, settings: &Settings) -> Result<()> {
        if settings.immutable_config {
            return Ok(());
        }

        let json = serde_json::to_string(settings).unwrap();

        self.connect()?
            .execute(
                "
                INSERT OR REPLACE INTO rhombus_config (id, config) VALUES (1, ?1)
            ",
                [json],
            )
            .await?;

        Ok(())
    }

    async fn load_settings(&self, _settings: &mut Settings) -> Result<()> {
        // if settings.immutable_config {
        //     return Ok(());
        // }

        // let db_settings: Option<Settings> = self
        //     .db
        //     .query("SELECT config FROM rhombus_config", ())
        //     .await?
        //     .next()
        //     .await?
        //     .map(|row| serde_json::from_str(&row.get::<String>(0).unwrap()).unwrap());

        // if let Some(db_settings) = db_settings {
        //     if settings.discord.first_blood_channel_id.is_none() {
        //         settings.discord.first_blood_channel_id =
        //             db_settings.discord.first_blood_channel_id;
        //     }

        //     if settings.discord.support_channel_id.is_none() {
        //         settings.discord.support_channel_id = db_settings.discord.support_channel_id;
        //     }

        //     if settings.discord.author_role_id.is_none() {
        //         settings.discord.author_role_id = db_settings.discord.author_role_id;
        //     }
        // }

        Ok(())
    }

    async fn get_scoreboard(&self, division_id: i64) -> Result<Scoreboard> {
        let tx = self.transaction().await?;

        #[derive(Debug, Deserialize)]
        struct DbTeam {
            id: i64,
            name: String,
        }

        let mut db_teams = tx.query("SELECT id, name FROM rhombus_team", ()).await?;
        let mut all_teams = BTreeMap::new();
        while let Some(row) = db_teams.next().await? {
            let team = de::from_row::<DbTeam>(&row).unwrap();
            all_teams.insert(team.id, team.name);
        }

        let top_team_ids = tx
            .query(
                "
                SELECT team_id
                FROM rhombus_team_division_points
                WHERE division_id = ?1
                ORDER BY points DESC, last_solved_at ASC
                LIMIT 10
            ",
                [division_id],
            )
            .await?
            .into_stream()
            .map(|row| row.unwrap().get::<i64>(0).unwrap())
            .collect::<Vec<_>>()
            .await;

        if top_team_ids.is_empty() {
            return Ok(Scoreboard {
                teams: Default::default(),
            });
        }

        #[derive(Debug, Deserialize)]
        struct DbScoreboard {
            team_id: i64,
            at: i64,
            points: i64,
        }

        let mut db_scoreboard = tx
            .query(
                "
                SELECT team_id, at, points
                FROM rhombus_points_snapshot
                WHERE division_id = ?1 AND team_id in (?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
                ORDER BY at ASC
            ",
                params!(
                    division_id,
                    top_team_ids[0],
                    top_team_ids.get(1).unwrap_or(&top_team_ids[0]),
                    top_team_ids.get(2).unwrap_or(&top_team_ids[0]),
                    top_team_ids.get(3).unwrap_or(&top_team_ids[0]),
                    top_team_ids.get(4).unwrap_or(&top_team_ids[0]),
                    top_team_ids.get(5).unwrap_or(&top_team_ids[0]),
                    top_team_ids.get(6).unwrap_or(&top_team_ids[0]),
                    top_team_ids.get(7).unwrap_or(&top_team_ids[0]),
                    top_team_ids.get(8).unwrap_or(&top_team_ids[0]),
                    top_team_ids.get(9).unwrap_or(&top_team_ids[0]),
                ),
            )
            .await?;

        let mut teams: BTreeMap<i64, ScoreboardTeam> = BTreeMap::new();
        let mut current_timestamp = 0;
        let mut current_hash: i64 = 0;
        let mut old_hash = 0;
        while let Some(row) = db_scoreboard.next().await? {
            let scoreboard = de::from_row::<DbScoreboard>(&row).unwrap();
            let series_point = ScoreboardSeriesPoint {
                timestamp: scoreboard.at,
                total_score: scoreboard.points,
            };

            if current_timestamp != scoreboard.at {
                current_timestamp = scoreboard.at;
                if current_hash == old_hash {
                    for team in teams.values_mut() {
                        team.series.pop();
                    }
                }
                old_hash = current_hash;
                current_hash = 0;
            }
            current_hash = current_hash.wrapping_add(scoreboard.points * scoreboard.team_id * 31);

            match teams.entry(scoreboard.team_id) {
                Entry::Vacant(entry) => {
                    entry.insert(ScoreboardTeam {
                        team_name: all_teams[&scoreboard.team_id].clone(),
                        series: vec![series_point],
                    });
                }
                Entry::Occupied(mut entry) => {
                    entry.get_mut().series.push(series_point);
                }
            }
        }

        Ok(Scoreboard { teams })
    }

    async fn get_leaderboard(&self, division_id: i64, page: Option<u64>) -> Result<Leaderboard> {
        #[derive(Debug, Deserialize)]
        struct DbLeaderboard {
            team_id: i64,
            name: String,
            points: f64,
        }

        if let Some(page) = page {
            let tx = self.transaction().await?;

            let num_teams = tx
                .query(
                    "
            SELECT COUNT(*)
            FROM rhombus_team_division_points
            WHERE division_id = ?1
        ",
                    [division_id],
                )
                .await?
                .next()
                .await?
                .unwrap()
                .get::<u64>(0)
                .unwrap();

            const PAGE_SIZE: u64 = 25;

            let num_pages = (num_teams + (PAGE_SIZE - 1)) / PAGE_SIZE;

            let page = page.min(num_pages);

            let mut rank = page * PAGE_SIZE;

            let leaderboard_entries = tx
                .query(
                    "
                SELECT team_id, name, points
                FROM rhombus_team_division_points
                JOIN rhombus_team ON rhombus_team_division_points.team_id = rhombus_team.id
                WHERE division_id = ?1
                ORDER BY points DESC, last_solved_at ASC
                LIMIT ?3 OFFSET ?2
            ",
                    params!(division_id, page * PAGE_SIZE, PAGE_SIZE),
                )
                .await?
                .into_stream()
                .map(|row| {
                    let db_leaderboard = de::from_row::<DbLeaderboard>(&row.unwrap()).unwrap();
                    rank += 1;
                    LeaderboardEntry {
                        rank,
                        team_id: db_leaderboard.team_id,
                        team_name: db_leaderboard.name,
                        score: db_leaderboard.points.round() as i64,
                    }
                })
                .collect::<Vec<_>>()
                .await;

            tx.commit().await?;

            Ok(Leaderboard {
                entries: leaderboard_entries,
                num_pages,
            })
        } else {
            let mut rank = 0;

            let leaderboard_entries = self
                .connect()?
                .query(
                    "
                SELECT team_id, name, points
                FROM rhombus_team_division_points
                JOIN rhombus_team ON rhombus_team_division_points.team_id = rhombus_team.id
                WHERE division_id = ?1
                ORDER BY points DESC
            ",
                    params!(division_id),
                )
                .await?
                .into_stream()
                .map(|row| {
                    let db_leaderboard = de::from_row::<DbLeaderboard>(&row.unwrap()).unwrap();
                    rank += 1;
                    LeaderboardEntry {
                        rank,
                        team_id: db_leaderboard.team_id,
                        team_name: db_leaderboard.name,
                        score: db_leaderboard.points.round() as i64,
                    }
                })
                .collect::<Vec<_>>()
                .await;

            Ok(Leaderboard {
                entries: leaderboard_entries,
                num_pages: 1,
            })
        }
    }

    async fn get_emails_for_user_id(&self, user_id: i64) -> Result<Vec<Email>> {
        #[derive(Debug, Deserialize)]
        struct QueryEmail {
            email: String,
            code: Option<String>,
        }

        let emails = self
            .connect()?
            .query(
                "SELECT email, code FROM rhombus_email WHERE user_id = ?1",
                [user_id],
            )
            .await?
            .into_stream()
            .map(|row| {
                let email = de::from_row::<QueryEmail>(&row.unwrap()).unwrap();
                Email {
                    address: email.email,
                    verified: email.code.is_none(),
                }
            })
            .collect::<Vec<_>>()
            .await;

        Ok(emails)
    }

    async fn create_email_verification_callback_code(
        &self,
        user_id: i64,
        email: &str,
    ) -> Result<String> {
        let code = generate_email_callback_code();

        self.connect()?
            .execute(
                "INSERT INTO rhombus_email (email, user_id, code) VALUES (?1, ?2, ?3)",
                params!(email, user_id, code.as_str()),
            )
            .await?;

        Ok(code)
    }

    async fn verify_email_verification_callback_code(&self, code: &str) -> Result<()> {
        self.connect()?
            .execute(
                "
                UPDATE rhombus_email
                SET code = NULL
                WHERE code = ?1
            ",
                [code],
            )
            .await?;

        Ok(())
    }

    async fn get_email_verification_by_callback_code(&self, code: &str) -> Result<String> {
        let email = self
            .connect()?
            .query(
                "
                SELECT email
                FROM rhombus_email
                WHERE code = ?1
            ",
                [code],
            )
            .await?
            .next()
            .await?
            .ok_or(libsql::Error::QueryReturnedNoRows)?
            .get::<String>(0)
            .unwrap();

        Ok(email)
    }

    async fn create_email_signin_callback_code(&self, email: &str) -> Result<String> {
        let code = generate_email_callback_code();

        self.connect()?
            .execute(
                "INSERT OR REPLACE INTO rhombus_email_signin (email, code) VALUES (?1, ?2)",
                params!(email, code.as_str()),
            )
            .await?;

        Ok(code)
    }

    async fn verify_email_signin_callback_code(&self, code: &str) -> Result<String> {
        let email = self
            .connect()?
            .query(
                "
                DELETE FROM rhombus_email_signin
                WHERE code = ?1
                RETURNING email
            ",
                [code],
            )
            .await?
            .next()
            .await?
            .ok_or(libsql::Error::QueryReturnedNoRows)?
            .get::<String>(0)
            .unwrap();

        Ok(email)
    }

    async fn get_email_signin_by_callback_code(&self, code: &str) -> Result<String> {
        let email = self
            .connect()?
            .query(
                "
                SELECT email
                FROM rhombus_email_signin
                WHERE code = ?1
            ",
                [code],
            )
            .await?
            .next()
            .await?
            .ok_or(libsql::Error::QueryReturnedNoRows)?
            .get::<String>(0)
            .unwrap();

        Ok(email)
    }

    async fn delete_email(&self, user_id: i64, email: &str) -> Result<()> {
        self.connect()?
            .execute(
                "DELETE FROM rhombus_email WHERE user_id = ?1 AND email = ?2",
                params!(user_id, email),
            )
            .await?;

        Ok(())
    }

    async fn get_user_divisions(&self, user_id: i64) -> Result<Vec<i64>> {
        let divisions = self
            .connect()?
            .query(
                "SELECT division_id FROM rhombus_user_division WHERE user_id = ?1",
                [user_id],
            )
            .await?
            .into_stream()
            .map(|row| row.unwrap().get::<i64>(0).unwrap())
            .collect::<Vec<_>>()
            .await;

        Ok(divisions)
    }

    async fn set_user_division(
        &self,
        user_id: i64,
        team_id: i64,
        division_id: i64,
        join: bool,
    ) -> Result<()> {
        let tx = self.transaction().await?;

        if join {
            let num_users_in_team = tx
                .query(
                    "SELECT COUNT(*) FROM rhombus_user WHERE team_id = ?1",
                    [team_id],
                )
                .await?
                .next()
                .await?
                .unwrap()
                .get::<i64>(0)
                .unwrap();

            tx
                .execute(
                    "INSERT OR IGNORE INTO rhombus_user_division (user_id, division_id) VALUES (?1, ?2)",
                    [user_id, division_id],
                )
                .await?;

            if num_users_in_team == 1 {
                tx
                    .execute(
                        "INSERT OR IGNORE INTO rhombus_team_division (team_id, division_id) VALUES (?1, ?2)",
                        [team_id, division_id],
                    )
                    .await?;
            }
        } else {
            _ = tx
                .execute(
                    "DELETE FROM rhombus_user_division WHERE user_id = ?1 AND division_id = ?2",
                    [user_id, division_id],
                )
                .await;
            _ = tx
                .execute(
                    "DELETE FROM rhombus_team_division WHERE team_id = ?1 AND division_id = ?2",
                    [team_id, division_id],
                )
                .await;
        }

        tx.commit().await?;

        Ok(())
    }

    async fn insert_divisions(&self, divisions: &[Division]) -> Result<()> {
        let tx = self.transaction().await?;

        let current_division_ids = tx
            .query("SELECT id FROM rhombus_division", ())
            .await?
            .into_stream()
            .map(|row| row.unwrap().get::<i64>(0).unwrap())
            .collect::<Vec<_>>()
            .await;

        for division_id in current_division_ids {
            if !divisions.iter().any(|d| d.id == division_id) {
                _ = tx
                    .execute("DELETE FROM rhombus_division WHERE id = ?1", [division_id])
                    .await;
            }
        }

        for division in divisions {
            tx.execute(
                "INSERT OR REPLACE INTO rhombus_division (id, name, description) VALUES (?1, ?2, ?3)",
                params!(division.id, division.name.as_str(), division.description.as_str()),
            )
            .await?;
        }

        tx.commit().await?;

        Ok(())
    }

    async fn get_team_divisions(&self, team_id: i64) -> Result<Vec<i64>> {
        let divisions = self
            .connect()?
            .query(
                "SELECT division_id FROM rhombus_team_division WHERE team_id = ?1",
                [team_id],
            )
            .await?
            .into_stream()
            .map(|row| row.unwrap().get::<i64>(0).unwrap())
            .collect::<Vec<_>>()
            .await;

        Ok(divisions)
    }

    async fn get_team_division_last_edit_time(
        &self,
        team_id: i64,
        division_id: i64,
    ) -> Result<Option<DateTime<Utc>>> {
        let last_edit_at_timestamp = self
            .connect()?
            .query(
                "
                SELECT last_edit_at
                FROM rhombus_team_division_last_edit
                WHERE team_id = ?1 AND division_id = ?2
                ",
                [team_id, division_id],
            )
            .await?
            .next()
            .await?
            .map(|row| row.get::<i64>(0).unwrap());

        let last_edit_at =
            last_edit_at_timestamp.and_then(|t| DateTime::<Utc>::from_timestamp(t, 0));

        Ok(last_edit_at)
    }

    async fn set_team_division_last_edit_time(&self, team_id: i64, division_id: i64) -> Result<()> {
        self.connect()?
            .execute(
                "
                INSERT OR REPLACE INTO rhombus_team_division_last_edit (team_id, division_id, last_edit_at)
                VALUES (?1, ?2, ?3)
            ",
                [team_id, division_id, chrono::Utc::now().timestamp()],
            )
            .await?;

        Ok(())
    }

    async fn set_team_division(&self, team_id: i64, division_id: i64, join: bool) -> Result<()> {
        if join {
            self.connect()?
                .execute(
                    "INSERT OR IGNORE INTO rhombus_team_division (team_id, division_id) VALUES (?1, ?2)",
                    [team_id, division_id],
                )
                .await?;
        } else {
            _ = self
                .connect()?
                .execute(
                    "DELETE FROM rhombus_team_division WHERE team_id = ?1 AND division_id = ?2",
                    [team_id, division_id],
                )
                .await;
        }

        Ok(())
    }

    async fn get_team_standings(&self, team_id: i64) -> Result<TeamStandings> {
        #[derive(Debug, Deserialize)]
        struct DbTeamDivisionPoints {
            division_id: i64,
            points: f64,
            rank: i64,
        }

        let mut standings = BTreeMap::new();
        let mut standing_rows = self
            .connect()?
            .query(
                "
                WITH ranked_teams AS (
                    SELECT
                        team_id,
                        division_id,
                        points,
                        RANK() OVER (PARTITION BY division_id ORDER BY points DESC) AS rank
                    FROM
                        rhombus_team_division_points
                )
                SELECT
                    division_id,
                    points,
                    rank
                FROM
                    ranked_teams
                WHERE
                    team_id = ?1
            ",
                [team_id],
            )
            .await?;
        while let Some(row) = standing_rows.next().await? {
            let standing = de::from_row::<DbTeamDivisionPoints>(&row).unwrap();
            standings.insert(
                standing.division_id,
                TeamStandingEntry {
                    points: standing.points as u64,
                    rank: standing.rank as u64,
                },
            );
        }

        Ok(TeamStandings { standings })
    }

    async fn upload_file(&self, hash: &str, filename: &str, bytes: &[u8]) -> Result<()> {
        self.connect()?
            .query(
                "INSERT INTO rhombus_file (hash, filename, contents) VALUES (?1, ?2, ?3)",
                params!(hash, filename, bytes),
            )
            .await?;

        Ok(())
    }

    async fn download_file(&self, hash: &str) -> Result<(Bytes, String)> {
        #[derive(Debug, Deserialize)]
        struct DbFile {
            filename: String,
            contents: Vec<u8>,
        }

        let row = self
            .connect()?
            .query(
                "SELECT filename, contents FROM rhombus_file WHERE hash = ?1",
                [hash],
            )
            .await?
            .next()
            .await?
            .ok_or(libsql::Error::QueryReturnedNoRows)?;

        let file = de::from_row::<DbFile>(&row).unwrap();

        Ok((Bytes::from(file.contents), file.filename))
    }

    async fn get_site_statistics(&self) -> Result<SiteStatistics> {
        let tx = self.transaction().await?;

        let total_users = tx
            .query("SELECT COUNT(*) FROM rhombus_user", ())
            .await?
            .next()
            .await?
            .unwrap()
            .get::<i64>(0)
            .unwrap();

        let total_teams = tx
            .query("SELECT COUNT(DISTINCT team_id) FROM rhombus_user", ())
            .await?
            .next()
            .await?
            .unwrap()
            .get::<i64>(0)
            .unwrap();

        let total_challenges = tx
            .query("SELECT COUNT(*) FROM rhombus_challenge", ())
            .await?
            .next()
            .await?
            .unwrap()
            .get::<i64>(0)
            .unwrap();

        let total_solves = tx
            .query("SELECT COUNT(*) FROM rhombus_solve", ())
            .await?
            .next()
            .await?
            .unwrap()
            .get::<i64>(0)
            .unwrap();

        #[derive(Debug, Deserialize)]
        struct QueryCategory {
            name: String,
            color: String,
            challenge_count: i64,
        }

        let categories = tx
            .query(
                "
            SELECT rhombus_category.name, rhombus_category.color, COUNT(*) AS challenge_count
            FROM rhombus_category
            JOIN rhombus_challenge ON rhombus_challenge.category_id = rhombus_category.id
            GROUP BY rhombus_category.id
            ORDER BY challenge_count DESC
            ",
                (),
            )
            .await?
            .into_stream()
            .map(|row| {
                let category = de::from_row::<QueryCategory>(&row.unwrap()).unwrap();
                StatisticsCategory {
                    name: category.name,
                    color: category.color,
                    num: category.challenge_count as u64,
                }
            })
            .collect::<Vec<_>>()
            .await;

        tx.commit().await?;
        Ok(SiteStatistics {
            total_users: total_users as u64,
            total_teams: total_teams as u64,
            total_challenges: total_challenges as u64,
            total_solves: total_solves as u64,
            categories,
        })
    }

    async fn get_last_created_ticket_time(&self, user_id: i64) -> Result<Option<DateTime<Utc>>> {
        let last_opened_at_timestamp = self
            .connect()?
            .query(
                "
                SELECT opened_at
                FROM rhombus_ticket
                WHERE user_id = ?1
                ORDER BY opened_at DESC
                LIMIT 1
            ",
                [user_id],
            )
            .await?
            .next()
            .await?
            .map(|row| row.get::<i64>(0).unwrap());

        let last_opened_at =
            last_opened_at_timestamp.and_then(|t| DateTime::<Utc>::from_timestamp(t, 0));

        Ok(last_opened_at)
    }
}

pub async fn create_team(tx: &Transaction) -> Result<i64> {
    loop {
        let team_invite_token = create_team_invite_token();

        let petname = to_title_case(&to_plural(&petname::petname(2, " ").unwrap()));
        let random_number = rand::thread_rng().gen_range(0..1000);
        let team_name = format!("{} {}", petname, random_number);

        if let Ok(team_id) = tx
            .query(
                "INSERT INTO rhombus_team (name, invite_token) VALUES (?1, ?2) RETURNING id",
                [team_name, team_invite_token],
            )
            .await?
            .next()
            .await
        {
            break Ok(team_id.unwrap().get::<i64>(0).unwrap());
        }
    }
}

#[cfg(test)]
mod test {
    use std::net::IpAddr;

    use crate::internal::database::{libsql::LocalLibSQL, provider::Database};

    #[tokio::test]
    async fn migrate_libsql() {
        let database = LocalLibSQL::new_memory().await.unwrap();
        database.migrate().await.unwrap();
    }

    #[tokio::test]
    async fn track_load() {
        let database = LocalLibSQL::new_memory().await.unwrap();
        database.migrate().await.unwrap();

        let ip: IpAddr = "1.2.3.4".parse().unwrap();
        for i in 0..1000 {
            let user_agent = i.to_string();
            database
                .insert_track(ip, Some(user_agent.as_str()), None, 1)
                .await
                .unwrap();
        }

        let num_tracks = database
            .conn
            .query("SELECT COUNT(*) FROM rhombus_track", ())
            .await
            .unwrap()
            .next()
            .await
            .unwrap()
            .unwrap()
            .get::<i64>(0)
            .unwrap();

        assert_eq!(32, num_tracks);
    }
}
