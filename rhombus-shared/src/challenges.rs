use crate::errors::{Result, RhombusSharedError};
use crate::proto::{Attachment, Author, Category, UpdateChallengesRequest, UpsertChallenge};
use figment::{
    providers::{Format, Yaml},
    Figment,
};
use futures::stream::FuturesUnordered;
use futures::StreamExt;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fmt::Write;
use std::future::Future;
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
    pub score_type: Option<String>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct AttachmentUpload {
    pub name: String,
    pub path: PathBuf,
    pub hash: String,
}

#[derive(Clone, Debug, PartialEq)]
pub enum AttachmentIntermediate {
    Literal(Attachment),
    Upload(AttachmentUpload),
}

impl AttachmentIntermediate {
    pub fn name(&self) -> &str {
        match self {
            AttachmentIntermediate::Literal(attachment) => attachment.name.as_str(),
            AttachmentIntermediate::Upload(attachment_upload) => attachment_upload.name.as_str(),
        }
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct ChallengeIntermediate {
    pub stable_id: String,
    pub author: String,
    pub category: String,
    pub description: String,
    pub files: Vec<AttachmentIntermediate>,
    pub flag: String,
    pub name: String,
    pub healthscript: Option<String>,
    pub ticket_template: Option<String>,
    pub metadata: serde_json::Value,
    pub score_type: String,
}

#[derive(Clone, Debug, PartialEq)]
pub struct ChallengesIntermediate {
    pub challenges: BTreeMap<String, ChallengeIntermediate>,
    pub authors: BTreeMap<String, Author>,
    pub categories: BTreeMap<String, Category>,
}

#[derive(Clone, Debug)]
/// A challenge update that can include uploading files
pub enum ChallengeUpdateIntermediate {
    EditChallenge {
        old: ChallengeIntermediate,
        new: ChallengeIntermediate,
    },
    CreateChallenge(ChallengeIntermediate),
    DeleteChallenge {
        stable_id: String,
    },

    EditAuthor {
        old: Author,
        new: Author,
    },
    CreateAuthor(Author),
    DeleteAuthor {
        stable_id: String,
    },

    EditCategory {
        old: Category,
        new: Category,
    },
    CreateCategory(Category),
    DeleteCategory {
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

pub async fn load_challenges(loader_path: &Path) -> Result<ChallengesIntermediate> {
    if !loader_path.exists() {
        Err(RhombusSharedError::LoaderYamlDoesNotExist(
            loader_path.to_path_buf(),
        ))?;
    }

    let loader = Figment::new()
        .merge(Yaml::file_exact(loader_path))
        .extract::<LoaderYaml>()?;

    let authors = loader
        .authors
        .into_iter()
        .map(|author| {
            (
                author.stable_id.clone(),
                Author {
                    name: author.name.unwrap_or_else(|| author.stable_id.clone()),
                    id: author.stable_id,
                    avatar: author.avatar,
                    discord_id: author.discord_id,
                },
            )
        })
        .collect::<BTreeMap<_, _>>();

    let categories = loader
        .categories
        .into_iter()
        .enumerate()
        .map(|(sequence, category)| {
            (
                category.stable_id.clone(),
                Category {
                    name: category.name.unwrap_or_else(|| category.stable_id.clone()),
                    id: category.stable_id,
                    color: category.color,
                    sequence: sequence as u64,
                },
            )
        })
        .collect::<BTreeMap<_, _>>();

    let search_path = absolutize(&PathBuf::from("."), loader_path.parent().unwrap());
    let challenges = ChallengeYamlWalker::new(&search_path)
        .map(|p| {
            let base_path = p.parent().unwrap_or(&p);
            let metadata = serde_yml::from_reader(std::fs::File::open(&p)?)?;
            Figment::new()
                .merge(Yaml::file_exact(&p))
                .extract::<ChallengeYaml>()
                .map_err(RhombusSharedError::Figment)
                .and_then(|challenge_yaml| {
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
                    .map_err(RhombusSharedError::Markdown)?;

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
                                    AttachmentIntermediate::Upload(AttachmentUpload {
                                        name: dst,
                                        hash: hash_file(&path)?,
                                        path,
                                    })
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
                            metadata,
                            score_type: challenge_yaml
                                .score_type
                                .unwrap_or_else(|| "dynamic".to_string()),
                        },
                    ))
                })
        })
        .collect::<Result<BTreeMap<_, _>>>()?;

    for challenge in challenges.values() {
        authors.get(&challenge.author).ok_or_else(|| {
            RhombusSharedError::AuthorNotFound(
                challenge.author.clone(),
                challenge.stable_id.clone(),
            )
        })?;
        categories.get(&challenge.category).ok_or_else(|| {
            RhombusSharedError::CategoryNotFound(
                challenge.category.clone(),
                challenge.stable_id.clone(),
            )
        })?;
    }

    Ok(ChallengesIntermediate {
        challenges,
        authors,
        categories,
    })
}

pub fn diff_challenges(
    old_challenges: &ChallengesIntermediate,
    new_challenges: &ChallengesIntermediate,
) -> Vec<ChallengeUpdateIntermediate> {
    let hash_to_url: HashMap<String, String> = old_challenges
        .challenges
        .values()
        .flat_map(|old_challenge| {
            old_challenge.files.iter().filter_map(|file| match file {
                AttachmentIntermediate::Literal(attachment) => attachment
                    .hash
                    .as_ref()
                    .map(|hash| (hash.clone(), attachment.url.clone())),
                AttachmentIntermediate::Upload { .. } => None,
            })
        })
        .collect();

    let mut updates = vec![];
    for (id, new_challenge) in new_challenges.challenges.iter() {
        match old_challenges.challenges.get(id) {
            Some(old_challenge) => {
                let mut new_challenge = new_challenge.clone();
                for file in new_challenge.files.iter_mut() {
                    if let AttachmentIntermediate::Upload(AttachmentUpload {
                        name,
                        path: _,
                        hash,
                    }) = file
                    {
                        if let Some(url) = hash_to_url.get(hash.as_str()) {
                            *file = AttachmentIntermediate::Literal(Attachment {
                                name: name.to_string(),
                                url: url.clone(),
                                hash: Some(hash.clone()),
                            })
                        }
                    }
                }
                if new_challenge != *old_challenge {
                    updates.push(ChallengeUpdateIntermediate::EditChallenge {
                        old: old_challenge.clone(),
                        new: new_challenge,
                    });
                }
            }
            None => updates.push(ChallengeUpdateIntermediate::CreateChallenge(
                new_challenge.clone(),
            )),
        }
    }
    for id in old_challenges
        .challenges
        .keys()
        .filter(|id| !new_challenges.challenges.contains_key(*id))
    {
        updates.push(ChallengeUpdateIntermediate::DeleteChallenge {
            stable_id: id.clone(),
        });
    }

    for (id, new_category) in new_challenges.categories.iter() {
        match old_challenges.categories.get(id) {
            Some(old_category) => {
                if old_category != new_category {
                    updates.push(ChallengeUpdateIntermediate::EditCategory {
                        old: old_category.clone(),
                        new: new_category.clone(),
                    });
                }
            }
            None => updates.push(ChallengeUpdateIntermediate::CreateCategory(
                new_category.clone(),
            )),
        }
    }
    for id in old_challenges
        .categories
        .keys()
        .filter(|id| !new_challenges.categories.contains_key(*id))
    {
        updates.push(ChallengeUpdateIntermediate::DeleteCategory {
            stable_id: id.clone(),
        });
    }

    for (id, new_author) in new_challenges.authors.iter() {
        match old_challenges.authors.get(id) {
            Some(old_author) => {
                if old_author != new_author {
                    updates.push(ChallengeUpdateIntermediate::EditAuthor {
                        old: old_author.clone(),
                        new: new_author.clone(),
                    });
                }
            }
            None => updates.push(ChallengeUpdateIntermediate::CreateAuthor(
                new_author.clone(),
            )),
        }
    }
    for id in old_challenges
        .authors
        .keys()
        .filter(|id| !new_challenges.authors.contains_key(*id))
    {
        updates.push(ChallengeUpdateIntermediate::DeleteAuthor {
            stable_id: id.clone(),
        });
    }

    updates
}

/// Takes a function used to upload a file, and runs it for all the files which need to be uploaded,
/// Returns a map from hash to url
pub async fn upload_files<Fut: Future<Output = std::result::Result<String, Err>>, Err>(
    difference: &[ChallengeUpdateIntermediate],
    f: impl Clone + Fn(&AttachmentUpload) -> Fut,
) -> std::result::Result<BTreeMap<String, String>, Err> {
    let files_to_upload: BTreeMap<String, AttachmentUpload> = difference
        .iter()
        .filter_map(|update| match update {
            ChallengeUpdateIntermediate::EditChallenge { old: _, new } => Some(new),
            ChallengeUpdateIntermediate::CreateChallenge(chal) => Some(chal),
            _ => None,
        })
        .flat_map(|chal| chal.files.iter())
        .filter_map(|file| match file {
            AttachmentIntermediate::Literal(_) => None,
            AttachmentIntermediate::Upload(upload) => Some(upload),
        })
        .map(|upload| (upload.hash.clone(), upload.clone()))
        .collect();

    let mut futures = FuturesUnordered::new();

    for (hash, upload) in files_to_upload {
        let f_clone = f.clone();
        futures.push(async move {
            let url = f_clone(&upload).await;
            (hash, url)
        });
    }

    let mut result = BTreeMap::new();
    while let Some((k, v)) = futures.next().await {
        result.insert(k, v?);
    }

    Ok(result)
}

/// Takes the difference in challenges and the uploaded files map (hash to url) returned by [upload_files]
pub fn update_challenges_request(
    difference: &[ChallengeUpdateIntermediate],
    uploaded_files: &BTreeMap<String, String>,
) -> UpdateChallengesRequest {
    UpdateChallengesRequest {
        upsert_challenges: difference
            .iter()
            .filter_map(|update| match update {
                ChallengeUpdateIntermediate::EditChallenge { old: _, new } => Some(new),
                ChallengeUpdateIntermediate::CreateChallenge(new) => Some(new),
                _ => None,
            })
            .map(|new| UpsertChallenge {
                id: new.stable_id.clone(),
                name: new.name.clone(),
                description: new.description.clone(),
                flag: new.flag.clone(),
                category: new.category.clone(),
                author: new.author.clone(),
                ticket_template: new.ticket_template.clone(),
                healthscript: new.healthscript.clone(),
                score_type: new.score_type.clone(),
                metadata: serde_json::to_string(&new.metadata)
                    .expect("failed to convert json to json"),
                attachments: new
                    .files
                    .iter()
                    .map(|file| match file {
                        AttachmentIntermediate::Literal(attachment) => attachment.clone(),
                        AttachmentIntermediate::Upload(upload) => Attachment {
                            name: upload.name.clone(),
                            url: uploaded_files
                                .get(&upload.hash)
                                .unwrap_or_else(|| {
                                    panic!("uploaded_files map is missing the hash {}", upload.hash)
                                })
                                .clone(),
                            hash: Some(upload.hash.clone()),
                        },
                    })
                    .collect(),
            })
            .collect(),
        upsert_authors: difference
            .iter()
            .filter_map(|update| match update {
                ChallengeUpdateIntermediate::EditAuthor { old: _, new } => Some(new.clone()),
                ChallengeUpdateIntermediate::CreateAuthor(author) => Some(author.clone()),
                _ => None,
            })
            .collect(),
        upsert_categories: difference
            .iter()
            .filter_map(|update| match update {
                ChallengeUpdateIntermediate::EditCategory { old: _, new } => Some(new.clone()),
                ChallengeUpdateIntermediate::CreateCategory(category) => Some(category.clone()),
                _ => None,
            })
            .collect(),
        delete_authors: difference
            .iter()
            .filter_map(|update| match update {
                ChallengeUpdateIntermediate::DeleteAuthor { stable_id } => Some(stable_id.clone()),
                _ => None,
            })
            .collect(),
        delete_categories: difference
            .iter()
            .filter_map(|update| match update {
                ChallengeUpdateIntermediate::DeleteCategory { stable_id } => {
                    Some(stable_id.clone())
                }
                _ => None,
            })
            .collect(),
        delete_challenges: difference
            .iter()
            .filter_map(|update| match update {
                ChallengeUpdateIntermediate::DeleteChallenge { stable_id } => {
                    Some(stable_id.clone())
                }
                _ => None,
            })
            .collect(),
    }
}

pub fn hash_file(path: &Path) -> Result<String> {
    let data = std::fs::read(path)?;
    let digest = ring::digest::digest(&ring::digest::SHA256, &data);
    let hash = slice_to_hex_string(digest.as_ref());
    Ok(hash)
}

pub fn slice_to_hex_string(slice: &[u8]) -> String {
    slice.iter().fold(String::new(), |mut output, b| {
        let _ = write!(output, "{b:02x}");
        output
    })
}
