use std::{
    collections::{hash_map::Entry, HashMap},
    net::IpAddr,
    path::Path,
    sync::Arc,
    time::Duration,
};

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use futures::stream::StreamExt;
use libsql::{de, params, Builder};
use rust_embed::RustEmbed;
use serde::Deserialize;

use super::{
    auth::{User, UserInner},
    database::{
        Author, Category, Challenge, ChallengeData, ChallengeSolve, Challenges, Database, Team,
        TeamInner, TeamMeta, TeamMetaInner, TeamUser,
    },
    team::create_team_invite_token,
};
use crate::Result;

#[derive(Clone)]
pub struct LibSQL {
    pub db: libsql::Connection,
}

impl LibSQL {
    pub async fn new_local(path: impl AsRef<Path>) -> Result<LibSQL> {
        let db = Builder::new_local(path).build().await?.connect()?;
        Ok(LibSQL { db })
    }

    pub async fn new_memory() -> Result<LibSQL> {
        let db = Builder::new_local(":memory:").build().await?.connect()?;
        Ok(LibSQL { db })
    }

    pub async fn new_remote(url: String, auth_token: String) -> Result<LibSQL> {
        let db = Builder::new_remote(url, auth_token)
            .build()
            .await?
            .connect()?;
        Ok(LibSQL { db })
    }

    pub async fn new_remote_replica(
        path: impl AsRef<Path>,
        url: String,
        auth_token: String,
    ) -> Result<LibSQL> {
        let db = Builder::new_remote_replica(path, url, auth_token)
            .sync_interval(Duration::from_secs(60))
            .build()
            .await?
            .connect()?;
        Ok(LibSQL { db })
    }
}

impl From<libsql::Connection> for LibSQL {
    fn from(value: libsql::Connection) -> Self {
        LibSQL { db: value }
    }
}

#[derive(RustEmbed)]
#[folder = "migrations/libsql"]
struct Migrations;

#[async_trait]
impl Database for LibSQL {
    async fn migrate(&self) -> Result<()> {
        self.db
            .execute_batch(
                std::str::from_utf8(Migrations::get("0001_setup.up.sql").unwrap().data.as_ref())
                    .unwrap(),
            )
            .await?;
        Ok(())
    }

    async fn upsert_user(
        &self,
        name: &str,
        email: &str,
        avatar: &str,
        discord_id: &str,
    ) -> Result<i64> {
        let team_name = format!("{}'s team", name);

        let tx = self.db.transaction().await?;
        let existing_user_id = tx
            .query(
                "SELECT id FROM rhombus_user WHERE discord_id = ?",
                [discord_id],
            )
            .await?
            .next()
            .await?;
        if let Some(existing_user_id) = existing_user_id {
            let existing_user_id = existing_user_id.get::<i64>(0).unwrap();
            return Ok(existing_user_id);
        }

        let team_invite_token = create_team_invite_token();

        let team_id = tx
            .query(
                "INSERT INTO rhombus_team (name, invite_token) VALUES (?1, ?2) RETURNING id",
                [team_name, team_invite_token],
            )
            .await?
            .next()
            .await?
            .unwrap()
            .get::<i64>(0)
            .unwrap();

        let user_id = tx
            .query(
                "INSERT INTO rhombus_user (name, avatar, discord_id, team_id, owner_team_id) VALUES (?1, ?2, ?3, ?4, ?4) RETURNING id",
                params!(name, avatar, discord_id, team_id),
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

        return Ok(user_id);
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
            .db
            .query(
                "
            INSERT INTO rhombus_track (ip, user_agent, requests) VALUES (?1, ?2, ?3)
            ON CONFLICT (ip, user_agent) DO
                UPDATE SET
                    last_seen_at = strftime('%s', 'now'),
                    requests = rhombus_track.requests + ?3
            RETURNING id
            ",
                params!(
                    ip,
                    user_agent.map(truncate_to_256_chars).unwrap_or(""),
                    requests
                ),
            )
            .await?
            .next()
            .await?
            .unwrap()
            .get::<i64>(0)
            .unwrap();

        if let Some(user_id) = user_id {
            self.db
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
        let challenge_rows = self
            .db
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
            healthy: bool,
            points: i64,
            author_id: i64,
            solves_count: i64,
            flag: String,
        }
        let challenges = challenge_rows
            .into_stream()
            .map(|row| de::from_row::<DbChallenge>(&row.unwrap()).unwrap())
            .map(|challenge| Challenge {
                id: challenge.id,
                name: challenge.name,
                description: challenge.description,
                category_id: challenge.category_id,
                healthy: challenge.healthy,
                points: challenge.points,
                solves: challenge.solves_count,
                author_id: challenge.author_id,
                flag: challenge.flag,
            })
            .collect::<Vec<Challenge>>()
            .await;

        let category_rows = self.db.query("SELECT * FROM rhombus_category", ()).await?;
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

        let mut author_rows = self.db.query("SELECT * FROM rhombus_author", ()).await?;
        #[derive(Debug, Deserialize)]
        struct DbAuthor {
            id: i64,
            name: String,
            avatar: String,
            discord_id: String,
        }
        let mut authors: HashMap<i64, Author> = Default::default();
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

        Ok(Arc::new(ChallengeData {
            challenges,
            categories,
            authors,
        }))
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
            .db
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
        let tx = self.db.transaction().await?;

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
            owner_team_id: i64,
        }
        let mut query_user_rows = tx
            .query(
                "SELECT id, name, avatar, owner_team_id FROM rhombus_user WHERE team_id = ?1",
                [team_id],
            )
            .await?;
        let mut users: HashMap<i64, TeamUser> = Default::default();
        while let Some(row) = query_user_rows.next().await? {
            let query_user = de::from_row::<QueryTeamUser>(&row).unwrap();
            users.insert(
                query_user.id,
                TeamUser {
                    name: query_user.name,
                    avatar_url: query_user.avatar,
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
                "SELECT challenge_id, user_id, solved_at FROM rhombus_solve JOIN rhombus_user ON rhombus_solve.user_id = rhombus_user.id WHERE team_id = ?1",
                [team_id],
            )
            .await?;
        let mut solves: HashMap<i64, ChallengeSolve> = Default::default();
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

        tx.commit().await?;

        Ok(Arc::new(TeamInner {
            id: team_id,
            name: query_team.name,
            invite_token: query_team.invite_token,
            users,
            solves,
        }))
    }

    async fn add_user_to_team(
        &self,
        user_id: i64,
        team_id: i64,
        _old_team_id: Option<i64>,
    ) -> Result<()> {
        self.db
            .execute(
                r#"
                UPDATE rhombus_user
                SET team_id = ?2
                WHERE id = ?1
            "#,
                [user_id, team_id],
            )
            .await?;

        Ok(())
    }

    async fn get_user_from_id(&self, user_id: i64) -> Result<User> {
        #[derive(Debug, Deserialize)]
        struct DbUser {
            id: i64,
            name: String,
            avatar: String,
            discord_id: String,
            team_id: i64,
            owner_team_id: i64,
            disabled: bool,
            is_admin: bool,
        }

        let row = self
            .db
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

    async fn roll_invite_token(&self, team_id: i64) -> Result<String> {
        let new_invite_token = create_team_invite_token();

        self.db
            .execute(
                "UPDATE rhombus_team SET invite_token = ?2 WHERE id = ?1",
                params!(team_id, new_invite_token.clone()),
            )
            .await?;

        Ok(new_invite_token)
    }

    async fn set_team_name(&self, team_id: i64, new_team_name: &str) -> Result<()> {
        self.db
            .execute(
                "UPDATE rhombus_team SET name = ?2 WHERE id = ?1",
                params!(team_id, new_team_name),
            )
            .await?;
        Ok(())
    }

    async fn solve_challenge(&self, user_id: i64, _team_id: i64, challenge_id: i64) -> Result<()> {
        self.db
            .execute(
                "INSERT INTO rhombus_solve (challenge_id, user_id) VALUES (?1, ?2)",
                params!(challenge_id, user_id),
            )
            .await?;
        Ok(())
    }
}

fn truncate_to_256_chars(s: &str) -> &str {
    if s.len() <= 256 {
        s
    } else {
        &s[..256]
    }
}

#[cfg(test)]
mod test {
    use std::net::IpAddr;

    use libsql::params;

    use crate::internal::{backend_libsql::LibSQL, database::Database};

    #[tokio::test]
    async fn migrate_libsql() {
        let database = LibSQL::new_memory().await.unwrap();
        database.migrate().await.unwrap();
    }

    #[tokio::test]
    async fn track_load() {
        let database = LibSQL::new_memory().await.unwrap();
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
            .db
            .query("SELECT COUNT(*) FROM rhombus_track", params!())
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
