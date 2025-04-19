use crate::errors::{Result, RhombusSharedError};
use crate::grpc::proto::{Attachment, GetChallengesAdminRequest};
use figment::{
    providers::{Format, Yaml},
    Figment,
};
use serde::{Deserialize, Serialize};
use std::fmt::Write;
use std::{
    collections::BTreeMap,
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
pub struct LoaderYaml {
    pub authors: Vec<AuthorYaml>,
    pub categories: Vec<CategoryYaml>,
}
#[derive(Clone, Default, Debug, PartialEq, Serialize, Deserialize)]
pub struct AuthorYaml {
    pub stable_id: String,
    pub name: Option<String>,
    pub avatar: String,
    pub discord_id: u64,
}

#[derive(Clone, Default, Debug, PartialEq, Serialize, Deserialize)]
pub struct CategoryYaml {
    pub stable_id: String,
    pub name: Option<String>,
    pub color: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct ChallengeYaml {
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

#[derive(Clone, Debug, PartialEq)]
pub enum AttachmentIntermediate {
    Literal(Attachment),
    Upload {
        name: String,
        path: PathBuf,
        hash: String,
    },
}

#[derive(Clone, Debug, PartialEq)]
pub struct ChallengeIntermediate {
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
pub enum ChallengeUpdateIntermediate {
    Edit {
        old: ChallengeIntermediate,
        new: ChallengeIntermediate,
    },
    Create(ChallengeIntermediate),
    Delete {
        stable_id: String,
    },
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ChallengeAttachmentYaml {
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
    let config: LoaderYaml = Figment::new()
        .merge(Yaml::file_exact("loader.yaml"))
        .extract()?;

    let search_path = absolutize(&PathBuf::from("."), loader_path.parent().unwrap());
    let new_challenges = ChallengeYamlWalker::new(&search_path)
        .into_iter()
        .map(|p| {
            let base_path = p.parent().unwrap_or(&p);
            Figment::new()
                .merge(Yaml::file_exact(&p))
                .extract::<ChallengeYaml>()
                .map_err(|err| RhombusSharedError::Figment(err))
                .and_then(|challenge_yaml| {
                    // TODO: Ask Mark if this should be done differently
                    let description = markdown::to_html_with_options(
                        &challenge_yaml.description,
                        &markdown::Options {
                            compile: markdown::CompileOptions {
                                allow_dangerous_html: true,
                                allow_dangerous_protocol: true,
                                ..markdown::CompileOptions::default()
                            },
                            ..markdown::Options::default()
                        },
                    )
                    .map_err(|message| RhombusSharedError::Markdown(message))?;
                    let files = challenge_yaml
                        .files
                        .into_iter()
                        .map(|file| {
                            Ok::<_, RhombusSharedError>(match file {
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
                        .collect::<Result<Vec<_>>>()?;
                    Ok((
                        challenge_yaml.stable_id.clone(),
                        ChallengeIntermediate {
                            name: challenge_yaml
                                .name
                                .unwrap_or_else(|| challenge_yaml.stable_id.clone()),
                            stable_id: challenge_yaml.stable_id,
                            author: challenge_yaml.author,
                            category: challenge_yaml.category,
                            description,
                            files,
                            flag: challenge_yaml.flag,
                            healthscript: challenge_yaml.healthscript,
                            ticket_template: challenge_yaml.ticket_template,
                        },
                    ))
                })
        })
        .collect::<Result<BTreeMap<_, _>>>()?;

    // let response = client
    //     .get_challenges_admin(GetChallengesAdminRequest {})
    //     .await?
    //     .into_inner();

    // let old_challenges = response
    //     .challenges
    //     .into_iter()
    //     .map(|challenge| {
    //         (
    //             challenge.id.clone(),
    //             ChallengeIntermediate {
    //                 stable_id: challenge.id,
    //                 author: challenge.author,
    //                 category: challenge.category,
    //                 description: challenge.description,
    //                 files: challenge
    //                     .attachments
    //                     .into_iter()
    //                     .map(|file| AttachmentIntermediate::Literal(file))
    //                     .collect(),
    //                 flag: challenge.flag,
    //                 healthscript: challenge.healthscript,
    //                 name: challenge.name,
    //                 ticket_template: challenge.ticket_template,
    //             },
    //         )
    //     })
    //     .collect::<BTreeMap<_, _>>();

    // let difference = diff_challenges(&old_challenges, &new_challenges);

    println!("=== New {:#?}\n\n\n", new_challenges);
    // println!("=== Old {:#?}\n\n\n", old_challenges);
    // println!("=== Dif {:#?}\n\n\n", difference);

    Ok(())
}

pub fn diff_challenges(
    old_challenges: &BTreeMap<String, ChallengeIntermediate>,
    new_challenges: &BTreeMap<String, ChallengeIntermediate>,
) -> Vec<ChallengeUpdateIntermediate> {
    let mut updates = vec![];
    for (id, new_challenge) in new_challenges.iter() {
        match old_challenges.get(id) {
            Some(old_challenge) => {
                let mut new_challenge = new_challenge.clone();
                for file in new_challenge.files.iter_mut() {
                    if let AttachmentIntermediate::Upload {
                        name,
                        path: _,
                        hash,
                    } = file
                    {
                        if let Some(existing_file) =
                            old_challenge.files.iter().find_map(|file| match file {
                                AttachmentIntermediate::Literal(attachment) => {
                                    (attachment.hash.as_ref() == Some(hash)).then_some(attachment)
                                }
                                AttachmentIntermediate::Upload { .. } => None,
                            })
                        {
                            *file = AttachmentIntermediate::Literal(Attachment {
                                name: name.to_string(),
                                url: existing_file.url.clone(),
                                hash: Some(hash.clone()),
                            })
                        }
                    }
                }
                if new_challenge != *old_challenge {
                    updates.push(ChallengeUpdateIntermediate::Edit {
                        old: old_challenge.clone(),
                        new: new_challenge,
                    });
                }
            }
            None => updates.push(ChallengeUpdateIntermediate::Create(new_challenge.clone())),
        }
    }
    for id in old_challenges
        .keys()
        .filter(|id| !new_challenges.contains_key(*id))
    {
        updates.push(ChallengeUpdateIntermediate::Delete {
            stable_id: id.clone(),
        });
    }

    updates
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
