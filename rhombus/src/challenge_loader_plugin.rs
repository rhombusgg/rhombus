use crate::{
    errors::RhombusError,
    internal::router::RouterState,
    plugin::{PluginMeta, RunContext},
    Plugin, Result, UploadProvider,
};
use axum::Router;
use futures::TryStreamExt;
use rhombus_shared::{
    challenges::{
        diff_challenges, load_challenges, update_challenges_request, upload_files,
        AttachmentIntermediate, ChallengeIntermediate, ChallengesIntermediate,
    },
    proto::{Attachment, Author, Category},
};
use std::path::PathBuf;
use tokio_util::{
    bytes::BytesMut,
    codec::{BytesCodec, FramedRead},
};
use tracing::info;

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

#[async_trait::async_trait]
impl Plugin for ChallengeLoaderPlugin {
    fn meta(&self) -> PluginMeta {
        PluginMeta {
            name: "Challenge Loader".into(),
            version: "0.0.1".into(),
            description: "Loads challenges from local files".into(),
        }
    }

    async fn run(&self, context: &mut RunContext<'_>) -> Result<Router<RouterState>> {
        let new_challenges = load_challenges(&self.path.join("loader.yaml")).await?;
        let old_challenge_data = context.db.get_challenges().await?;
        let old_challenges = ChallengesIntermediate {
            challenges: old_challenge_data
                .challenges
                .values()
                .map(|challenge| {
                    (
                        challenge.id.clone(),
                        ChallengeIntermediate {
                            stable_id: challenge.id.clone(),
                            author: challenge.author_id.clone(),
                            category: challenge.category_id.clone(),
                            description: challenge.description.clone(),
                            files: challenge
                                .attachments
                                .iter()
                                .map(|file| {
                                    AttachmentIntermediate::Literal(Attachment {
                                        name: file.name.clone(),
                                        url: file.url.clone(),
                                        hash: file.hash.clone(),
                                    })
                                })
                                .collect(),
                            flag: challenge.flag.clone(),
                            name: challenge.name.clone(),
                            healthscript: challenge.healthscript.clone(),
                            ticket_template: challenge.ticket_template.clone(),
                            metadata: challenge.metadata.clone(),
                            score_type: challenge.score_type.clone(),
                        },
                    )
                })
                .collect(),
            authors: old_challenge_data
                .authors
                .values()
                .map(|author| {
                    (
                        author.id.clone(),
                        Author {
                            id: author.id.clone(),
                            name: author.name.clone(),
                            avatar: author.avatar_url.clone(),
                            discord_id: author.discord_id.into(),
                        },
                    )
                })
                .collect(),
            categories: old_challenge_data
                .categories
                .values()
                .map(|category| {
                    (
                        category.id.clone(),
                        Category {
                            id: category.id.clone(),
                            name: category.name.clone(),
                            color: category.color.clone(),
                            sequence: category.sequence,
                        },
                    )
                })
                .collect(),
        };

        let difference = diff_challenges(&old_challenges, &new_challenges);

        if difference.is_empty() {
            info!("Challenges up to date");
            return Ok(Router::new());
        }

        let uploaded_files = upload_files(&difference, |upload| {
            let upload = upload.clone();
            let upload_provider = context.upload_provider.as_ref();
            async move {
                let file = tokio::fs::File::open(&upload.path).await?;
                let stream = FramedRead::new(file, BytesCodec::new()).map_ok(BytesMut::freeze);

                let url = upload_provider.upload(&upload.name, stream).await?;
                Ok::<String, RhombusError>(url)
            }
        })
        .await?;
        let request = update_challenges_request(&difference, &uploaded_files);
        context
            .db
            .update_challenges(&request, context.score_type_map.clone())
            .await?;

        info!("Successfully updated challenges");

        Ok(Router::new())
    }
}
