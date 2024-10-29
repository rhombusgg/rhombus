use core::panic;
use std::{
    collections::BTreeSet,
    fs::{self, ReadDir},
    hash::{BuildHasher, BuildHasherDefault, Hasher},
    path::{Path, PathBuf},
};

use axum::Router;
use config::Config;
use futures::{StreamExt, TryFutureExt, TryStreamExt};
use libsql::params;
use serde::{Deserialize, Serialize};
use tokio_util::{
    bytes::BytesMut,
    codec::{BytesCodec, FramedRead},
};

use crate::{
    internal::{
        database::libsql::LibSQLConnection, local_upload_provider::slice_to_hex_string,
        router::RouterState,
    },
    plugin::RunContext,
    Plugin, Result, UploadProvider,
};

pub struct ChallengeLoaderPlugin {
    pub path: PathBuf,
}

impl Default for ChallengeLoaderPlugin {
    fn default() -> Self {
        ChallengeLoaderPlugin::new(PathBuf::from("."))
    }
}

impl ChallengeLoaderPlugin {
    pub fn new(path: PathBuf) -> Self {
        Self { path }
    }
}

impl Plugin for ChallengeLoaderPlugin {
    async fn run<U: UploadProvider>(
        &self,
        context: &mut RunContext<'_, U>,
    ) -> Result<Router<RouterState>> {
        let config = Config::builder()
            .add_source(config::File::from(self.path.join("loader.yaml")))
            .build()
            .unwrap()
            .try_deserialize::<ChallengeLoaderConfiguration>()
            .unwrap();

        let walker = ChallengeYamlWalker::new(self.path.as_path());

        let challenges = walker
            .map(|path| {
                let challenge = Config::builder()
                    .add_source(config::File::from(path.as_path()))
                    .build()
                    .unwrap()
                    .try_deserialize::<Challenge>()
                    .unwrap();
                let metadata = Config::builder()
                    .add_source(config::File::from(path.as_path()))
                    .build()
                    .unwrap()
                    .try_deserialize::<serde_json::Value>()
                    .unwrap();
                let root = path.parent().unwrap().to_path_buf();
                ChallengeIntermediate {
                    stable_id: challenge.stable_id,
                    name: challenge.name,
                    description: challenge.description,
                    flag: challenge.flag,
                    category: challenge.category,
                    author: challenge.author,
                    ticket_template: challenge.ticket_template,
                    score_type: challenge.score_type.unwrap_or("dynamic".to_owned()),
                    files: challenge.files,
                    healthscript: challenge.healthscript,
                    root,
                    metadata: serde_json::to_string(&metadata).unwrap(),
                }
            })
            .collect::<Vec<_>>();

        challenges.iter().for_each(|challenge| {
            let name = challenge.stable_id.as_ref().unwrap_or(&challenge.name);
            _ = config
                .categories
                .iter()
                .find(|category| category.name == challenge.category)
                .unwrap_or_else(|| {
                    panic!(
                        "Category {} not found for challenge {}",
                        challenge.category, name
                    )
                });
            _ = config
                .authors
                .iter()
                .find(|author| author.name == challenge.author)
                .unwrap_or_else(|| {
                    panic!(
                        "Author {} not found for challenge {}",
                        challenge.author, name
                    )
                });
        });

        match context.rawdb {
            #[allow(unused_labels)]
            crate::builder::RawDb::Plugin(d) => 'raw: {
                #[cfg(feature = "mysql")]
                if let Some(mysql) = d.downcast_ref::<sqlx::MySqlPool>() {
                    let row: (i64,) = sqlx::query_as("SELECT 3 + 8").fetch_one(mysql).await?;
                    tracing::info!("Database provider: {}", row.0);
                    break 'raw;
                }

                _ = d;
                panic!("Unsupported database type for ChallengeLoaderPlugin");
            }

            #[cfg(feature = "postgres")]
            crate::builder::RawDb::Postgres(_) => panic!("Postgres not supported"),

            #[cfg(feature = "libsql")]
            crate::builder::RawDb::LibSQL(db) => {
                let tx = db.transaction().await?;

                let new_challenge_ids = challenges
                    .iter()
                    .map(|challenge| {
                        challenge
                            .stable_id
                            .as_ref()
                            .unwrap_or(&challenge.name)
                            .as_str()
                    })
                    .collect::<Vec<_>>();
                let mut challenge_id_rows =
                    tx.query("SELECT id FROM rhombus_challenge", ()).await?;
                while let Some(row) = challenge_id_rows.next().await? {
                    let challenge_id = row.get::<String>(0).unwrap();
                    if !new_challenge_ids.contains(&challenge_id.as_str()) {
                        tx.execute(
                            "DELETE FROM rhombus_file_attachment WHERE challenge_id = ?1",
                            [challenge_id.as_str()],
                        )
                        .await?;

                        tx.execute(
                            "DELETE FROM rhombus_challenge WHERE id = ?1",
                            [challenge_id.as_str()],
                        )
                        .await?;
                    }
                }

                let new_author_ids = config
                    .authors
                    .iter()
                    .map(|author| author.stable_id.as_ref().unwrap_or(&author.name).as_str())
                    .collect::<Vec<_>>();
                let mut author_id_rows = tx.query("SELECT id FROM rhombus_author", ()).await?;
                while let Some(row) = author_id_rows.next().await? {
                    let author_id = row.get::<String>(0).unwrap();
                    if !new_author_ids.contains(&author_id.as_str()) {
                        tx.execute(
                            "DELETE FROM rhombus_author WHERE id = ?1",
                            [author_id.as_str()],
                        )
                        .await?;
                    }
                }

                let new_category_ids = config
                    .categories
                    .iter()
                    .map(|category| {
                        category
                            .stable_id
                            .as_ref()
                            .unwrap_or(&category.name)
                            .as_str()
                    })
                    .collect::<Vec<_>>();

                let mut category_id_rows = tx.query("SELECT id FROM rhombus_category", ()).await?;
                while let Some(row) = category_id_rows.next().await? {
                    let category_id = row.get::<String>(0).unwrap();
                    if !new_category_ids.contains(&category_id.as_str()) {
                        tx.execute("DELETE FROM rhombus_category WHERE id = ?1", [category_id])
                            .await?;
                    }
                }

                for author in &config.authors {
                    let id = author.stable_id.as_ref().unwrap_or(&author.name);
                    _ = tx
                        .execute(
                            "INSERT OR REPLACE INTO rhombus_author (id, name, avatar, discord_id) VALUES (?1, ?2, ?3, ?4)",
                            params!(id.as_str(), author.name.as_str(), author.avatar.as_str(), author.discord_id.as_deref()),
                        )
                        .await?;
                }

                for (sequence, category) in config.categories.iter().enumerate() {
                    let color = category
                        .color
                        .as_deref()
                        .unwrap_or(get_color(&category.name));
                    let id = category.stable_id.as_ref().unwrap_or(&category.name);
                    let _ = tx
                        .execute(
                            "INSERT OR REPLACE INTO rhombus_category (id, name, color, sequence) VALUES (?1, ?2, ?3, ?4)",
                            params!(id.as_str(), category.name.as_str(), color, sequence as i64),
                        )
                        .await?;
                }

                for challenge in &challenges {
                    let category_id = config
                        .categories
                        .iter()
                        .find(|category| category.name == challenge.category)
                        .unwrap()
                        .stable_id
                        .as_ref()
                        .unwrap_or(&challenge.category);
                    let author_id = config
                        .authors
                        .iter()
                        .find(|author| author.name == challenge.author)
                        .unwrap()
                        .stable_id
                        .as_ref()
                        .unwrap_or(&challenge.author);
                    let id = challenge.stable_id.as_ref().unwrap_or(&challenge.name);

                    tracing::info!(name = challenge.name);

                    let description = markdown::to_html_with_options(
                        &challenge.description,
                        &markdown::Options {
                            compile: markdown::CompileOptions {
                                allow_dangerous_html: true,
                                allow_dangerous_protocol: true,
                                ..markdown::CompileOptions::default()
                            },
                            ..markdown::Options::default()
                        },
                    )
                    .unwrap();

                    let points = context
                        .score_type_map
                        .lock()
                        .await
                        .get(challenge.score_type.as_str())
                        .unwrap()
                        .initial(&serde_json::from_str(&challenge.metadata).unwrap())
                        .await
                        .unwrap();

                    _ = tx
                        .execute(
                            "
                            INSERT INTO rhombus_challenge (id, name, description, flag, category_id, author_id, ticket_template, healthscript, score_type, points, metadata)
                            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
                            ON CONFLICT(id) DO UPDATE SET
                                name = excluded.name,
                                description = excluded.description,
                                flag = excluded.flag,
                                category_id = excluded.category_id,
                                author_id = excluded.author_id,
                                ticket_template = excluded.ticket_template,
                                healthscript = excluded.healthscript,
                                score_type = excluded.score_type,
                                metadata = excluded.metadata
                        ",
                            params!(
                                id.as_str(),
                                challenge.name.as_str(),
                                description.as_str(),
                                challenge.flag.as_str(),
                                category_id.as_str(),
                                author_id.as_str(),
                                challenge.ticket_template.as_str(),
                                challenge.healthscript.as_deref(),
                                challenge.score_type.as_str(),
                                points,
                                challenge.metadata.as_str(),
                            ),
                        )
                        .await?;

                    let mut attachment_urls = tx
                        .query(
                            "SELECT url FROM rhombus_file_attachment WHERE challenge_id = ?1",
                            [id.as_str()],
                        )
                        .await?
                        .into_stream()
                        .map(|row| row.unwrap().get::<String>(0).unwrap())
                        .collect::<BTreeSet<_>>()
                        .await;

                    for file in challenge.files.iter() {
                        #[derive(Debug, Deserialize)]
                        struct QueryPrevious {
                            hash: String,
                            url: String,
                        }

                        let previous = tx
                            .query(
                                "SELECT hash, url FROM rhombus_file_attachment WHERE challenge_id = ?1 AND name = ?2",
                                params!(id.as_str(), file.dst.as_str()),
                            )
                            .await?
                            .next()
                            .await?
                            .and_then(|row| {
                                libsql::de::from_row::<QueryPrevious>(&row).ok()
                            });

                        let (url, hash) = if let Some(url) = &file.url {
                            (url.to_owned(), None)
                        } else if let Some(src) = &file.src {
                            let src = challenge.root.join(src);

                            let data = tokio::fs::read(&src).await?;
                            let digest = ring::digest::digest(&ring::digest::SHA256, &data);
                            let hash = slice_to_hex_string(digest.as_ref());

                            if let Some(previous) = previous {
                                if previous.hash == hash {
                                    attachment_urls.remove(&previous.url);
                                    continue;
                                }
                            }

                            let stream = tokio::fs::File::open(&src)
                                .map_ok(|file| {
                                    FramedRead::new(file, BytesCodec::new())
                                        .map_ok(BytesMut::freeze)
                                })
                                .try_flatten_stream();

                            let url = context
                                .upload_provider
                                .upload(&file.dst, stream)
                                .await
                                .unwrap();

                            (url, Some(hash))
                        } else {
                            panic!("No URL or source provided for file {}", file.dst);
                        };
                        let dst = file.dst.clone();
                        _ = tx
                            .execute(
                                "
                                INSERT OR REPLACE INTO rhombus_file_attachment (challenge_id, name, url, hash)
                                VALUES (?1, ?2, ?3, ?4)
                            ",
                                params!(id.as_str(), dst, url.as_str(), hash),
                            )
                            .await?;
                        attachment_urls.remove(&url);
                    }

                    for url in attachment_urls {
                        tx.execute(
                            "DELETE FROM rhombus_file_attachment WHERE challenge_id = ?1 AND url = ?2",
                            params!(id.as_str(), url),
                        )
                        .await?;
                    }
                }

                tx.commit().await?;
            }
        };

        Ok(Router::new())
    }
}

pub fn get_color(category_id: &str) -> &'static str {
    let mut hasher =
        BuildHasherDefault::<std::collections::hash_map::DefaultHasher>::default().build_hasher();
    hasher.write(category_id.as_bytes());
    let hash_value = hasher.finish() as usize;
    let colors = ["#ef4444", "#f97316", "#f59e0b"];
    colors[hash_value % colors.len()]
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Challenge {
    pub stable_id: Option<String>,
    pub name: String,
    pub description: String,
    pub flag: String,
    pub category: String,
    pub author: String,
    pub ticket_template: String,
    pub score_type: Option<String>,
    pub files: Vec<Attachment>,
    pub healthscript: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ChallengeIntermediate {
    pub stable_id: Option<String>,
    pub name: String,
    pub description: String,
    pub flag: String,
    pub category: String,
    pub author: String,
    pub ticket_template: String,
    pub score_type: String,
    pub files: Vec<Attachment>,
    pub healthscript: Option<String>,
    pub root: PathBuf,
    pub metadata: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Attachment {
    pub src: Option<String>,
    pub url: Option<String>,
    pub dst: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Category {
    pub stable_id: Option<String>,
    pub name: String,
    pub color: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Author {
    pub stable_id: Option<String>,
    pub name: String,
    pub avatar: String,
    pub discord_id: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ChallengeLoaderConfiguration {
    pub categories: Vec<Category>,
    pub authors: Vec<Author>,
}

struct ChallengeYamlWalker {
    stack: Vec<ReadDir>,
}

impl ChallengeYamlWalker {
    fn new(root: &Path) -> Self {
        let mut stack = Vec::new();
        if root.is_dir() {
            stack.push(fs::read_dir(root).unwrap());
        }
        ChallengeYamlWalker { stack }
    }
}

impl Iterator for ChallengeYamlWalker {
    type Item = PathBuf;

    fn next(&mut self) -> Option<Self::Item> {
        while let Some(dir_iter) = self.stack.last_mut() {
            if let Some(entry) = dir_iter.next() {
                match entry {
                    Ok(entry) => {
                        let path = entry.path();
                        if path.is_dir() {
                            self.stack.push(fs::read_dir(path).unwrap());
                        } else if path.is_file() && path.file_name().unwrap() == "challenge.yaml" {
                            return Some(path);
                        }
                    }
                    Err(_) => continue,
                }
            } else {
                self.stack.pop();
            }
        }
        None
    }
}
