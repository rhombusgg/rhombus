use crate::{
    get_client,
    grpc::proto::{Attachment, GetChallengesAdminRequest},
};
use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use colored::Colorize;
use figment::{
    providers::{Format, Yaml},
    Figment,
};
use serde::{Deserialize, Serialize};
use std::fmt::Write;
use std::{
    collections::{BTreeMap, HashMap},
    fs::{self, ReadDir},
    path::{Path, PathBuf},
};

pub struct ChallengeYamlWalker {
    stack: Vec<ReadDir>,
}

impl ChallengeYamlWalker {
    pub fn new(root: &Path) -> Self {
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

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
struct LoaderYaml {
    pub authors: Vec<AuthorYaml>,
    pub categories: Vec<CategoryYaml>,
}
#[derive(Clone, Default, Debug, PartialEq, Serialize, Deserialize)]
struct AuthorYaml {
    pub stable_id: String,
    pub name: Option<String>,
    pub avatar: String,
    pub discord_id: u64,
}

#[derive(Clone, Default, Debug, PartialEq, Serialize, Deserialize)]
struct CategoryYaml {
    pub stable_id: String,
    pub name: Option<String>,
    pub color: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
struct ChallengeYaml {
    pub stable_id: String,
    pub author: String,
    pub category: String,
    pub description: String,
    pub files: Vec<ChallengeAttachmentYaml>,
    pub flag: String,
    pub healthscript: Option<String>,
    pub name: Option<String>,
    pub ticket_template: Option<String>,
}

#[derive(Clone, Debug)]
enum AttachmentIntermediate {
    Literal(Attachment),
    Upload {
        name: String,
        path: PathBuf,
        hash: String,
    },
}

#[derive(Clone, Debug)]
struct ChallengeIntermediate {
    stable_id: String,
    author: String,
    category: String,
    description: String,
    files: Vec<AttachmentIntermediate>,
    flag: String,
    name: String,
    healthscript: Option<String>,
    ticket_template: Option<String>,
}

#[derive(Clone, Debug)]
enum ChallengeUpdateIntermediate {
    Edit(ChallengeIntermediate),
    Create(ChallengeIntermediate),
    Delete { stable_id: String },
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
enum ChallengeAttachmentYaml {
    Url { url: String, dst: String },
    File { src: String, dst: String },
}

fn absolutize(base: &Path, p: &Path) -> PathBuf {
    if p.is_absolute() {
        p.to_path_buf()
    } else {
        base.join(p)
    }
}

pub async fn apply_challenges(loader_path: &Path) -> Result<()> {
    let mut client = get_client().await?;

    let config: LoaderYaml = Figment::new()
        .merge(Yaml::file_exact("loader.yaml"))
        .extract()?;

    let new_challenges = ChallengeYamlWalker::new(&PathBuf::from("."))
        .into_iter()
        .map(|p| {
            let base_path = p.parent().unwrap_or(&p);
            Figment::new()
                .merge(Yaml::file_exact(&p))
                .extract::<ChallengeYaml>()
                .with_context(|| format!("failed to load {}", p.display()))
                .and_then(|challenge_yaml| {
                    Ok((
                        challenge_yaml.stable_id.clone(),
                        ChallengeIntermediate {
                            name: challenge_yaml
                                .name
                                .unwrap_or_else(|| challenge_yaml.stable_id.clone()),
                            stable_id: challenge_yaml.stable_id,
                            author: challenge_yaml.author,
                            category: challenge_yaml.category,
                            description: challenge_yaml.description,
                            files: challenge_yaml
                                .files
                                .into_iter()
                                .map(|file| {
                                    Ok::<_, anyhow::Error>(match file {
                                        ChallengeAttachmentYaml::Url { url, dst } => {
                                            AttachmentIntermediate::Literal(Attachment {
                                                name: dst,
                                                url,
                                                hash: None,
                                            })
                                        }
                                        ChallengeAttachmentYaml::File { src, dst } => {
                                            let path = absolutize(base_path, &PathBuf::from(&src));
                                            AttachmentIntermediate::Upload {
                                                name: dst,
                                                hash: hash_file(&path)?,
                                                path,
                                            }
                                        }
                                    })
                                })
                                .collect::<Result<Vec<_>>>()?,
                            flag: challenge_yaml.flag,
                            healthscript: challenge_yaml.healthscript,
                            ticket_template: challenge_yaml.ticket_template,
                        },
                    ))
                })
        })
        .collect::<Result<BTreeMap<_, _>>>()?;

    let response = client
        .get_challenges_admin(GetChallengesAdminRequest {})
        .await?
        .into_inner();

    let old_challenges = response
        .challenges
        .into_iter()
        .map(|challenge| {
            (
                challenge.id.clone(),
                ChallengeIntermediate {
                    stable_id: challenge.id,
                    author: challenge.author,
                    category: challenge.category,
                    description: challenge.description,
                    files: challenge
                        .attachments
                        .into_iter()
                        .map(|file| AttachmentIntermediate::Literal(file))
                        .collect(),
                    flag: challenge.flag,
                    healthscript: challenge.healthscript,
                    name: challenge.name,
                    ticket_template: challenge.ticket_template,
                },
            )
        })
        .collect::<BTreeMap<_, _>>();

    println!("New {:#?}", new_challenges);
    println!("Old {:#?}", old_challenges);

    Ok(())
}

fn hash_file(path: &Path) -> Result<String> {
    let data = std::fs::read(&path)?;
    let digest = ring::digest::digest(&ring::digest::SHA256, &data);
    let hash = slice_to_hex_string(digest.as_ref());
    Ok(hash)
}

fn slice_to_hex_string(slice: &[u8]) -> String {
    slice.iter().fold(String::new(), |mut output, b| {
        let _ = write!(output, "{b:02x}");
        output
    })
}
