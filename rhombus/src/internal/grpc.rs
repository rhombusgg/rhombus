use crate::grpc::proto::rhombus_server::{Rhombus, RhombusServer};
use crate::grpc::proto::whoami_reply::Whoami;
use crate::grpc::proto::{
    self, Attachment, ChallengeAdmin, GetChallengesAdminResponse, User, WhoamiReply,
    FILE_DESCRIPTOR_SET,
};
use crate::internal::database::provider::Connection;
use crate::plugin::RunContext;

struct RhombusImpl {
    db: Connection,
    root_key: Option<String>,
}

enum KeyHolder {
    Root,
    User(super::auth::User),
}

impl KeyHolder {
    fn is_admin(&self) -> bool {
        match self {
            KeyHolder::Root => true,
            KeyHolder::User(user) => user.is_admin,
        }
    }
}

impl RhombusImpl {
    fn get_key(
        &self,
        metadata: &tonic::metadata::MetadataMap,
    ) -> std::result::Result<String, tonic::Status> {
        metadata
            .get("authorization")
            .and_then(|s| s.to_str().ok())
            .map(|s| s.trim_start_matches("bearer "))
            .map(|s| s.trim_start_matches("Bearer "))
            .map(|s| s.to_owned())
            .ok_or_else(|| tonic::Status::unauthenticated("Missing authorization header"))
    }

    async fn get_key_holder(
        &self,
        metadata: &tonic::metadata::MetadataMap,
    ) -> std::result::Result<KeyHolder, tonic::Status> {
        let key = self.get_key(metadata)?;

        if self
            .root_key
            .as_ref()
            .is_some_and(|root_key| key.as_str() == root_key.as_str())
        {
            return Ok(KeyHolder::Root);
        }

        let user = self
            .db
            .get_user_from_api_key(&key)
            .await
            .map_err(|_| tonic::Status::unauthenticated("Invalid api key"))?;

        Ok(KeyHolder::User(user))
    }

    async fn get_admin_key_holder(
        &self,
        metadata: &tonic::metadata::MetadataMap,
    ) -> std::result::Result<KeyHolder, tonic::Status> {
        let key_holder = self.get_key_holder(metadata).await?;
        if !key_holder.is_admin() {
            return Err(tonic::Status::unauthenticated("Invalid api key"));
        }
        Ok(key_holder)
    }
}

#[tonic::async_trait]
impl Rhombus for RhombusImpl {
    async fn whoami(
        &self,
        request: tonic::Request<proto::WhoamiRequest>,
    ) -> std::result::Result<tonic::Response<WhoamiReply>, tonic::Status> {
        let key_holder = self.get_key_holder(request.metadata()).await?;
        match key_holder {
            KeyHolder::Root => Ok(tonic::Response::new(WhoamiReply {
                whoami: Some(Whoami::Root(())),
            })),
            KeyHolder::User(user) => Ok(tonic::Response::new(WhoamiReply {
                whoami: Some(Whoami::User(User {
                    id: user.id,
                    name: user.name.clone(),
                    is_admin: user.is_admin,
                })),
            })),
        }
    }

    async fn get_challenges_admin(
        &self,
        request: tonic::Request<proto::GetChallengesAdminRequest>,
    ) -> std::result::Result<tonic::Response<GetChallengesAdminResponse>, tonic::Status> {
        let _ = self.get_admin_key_holder(request.metadata());
        let challenges = self
            .db
            .get_challenges()
            .await
            .map_err(|_| tonic::Status::internal("Failed to get challenges"))?;
        Ok(tonic::Response::new(GetChallengesAdminResponse {
            challenges: challenges
                .challenges
                .iter()
                .map(|(stable_id, challenge)| ChallengeAdmin {
                    id: stable_id.clone(),
                    name: challenge.name.clone(),
                    description: challenge.description.clone(),
                    flag: challenge.flag.clone(),
                    category: challenge.category_id.clone(),
                    author: challenge.author_id.clone(),
                    ticket_template: challenge.ticket_template.clone(),
                    healthscript: challenge.healthscript.clone(),
                    score_type: challenge.score_type.clone(),
                    metadata: serde_json::to_string(&challenge.metadata)
                        .unwrap_or_else(|_| "{}".to_owned()),
                    points: challenge.points,
                    attachments: challenge
                        .attachments
                        .iter()
                        .map(|attachment| Attachment {
                            name: attachment.name.clone(),
                            url: attachment.url.clone(),
                            hash: attachment.hash.clone(),
                        })
                        .collect(),
                })
                .collect(),
        }))
    }
}

pub async fn init_grpc<'a>(run_context: &mut RunContext<'a>) {
    let service = RhombusImpl {
        db: run_context.db.clone(),
        root_key: run_context.settings.read().await.root_api_key.clone(),
    };
    run_context
        .grpc_builder
        .add_service(RhombusServer::new(service));
    run_context
        .grpc_builder
        .register_encoded_file_descriptor_set(FILE_DESCRIPTOR_SET);
}
