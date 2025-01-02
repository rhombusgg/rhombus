use crate::grpc::proto::rhombus_server::{Rhombus, RhombusServer};
use crate::grpc::proto::whoami_reply::Whoami;
use crate::grpc::proto::{self, User, WhoamiReply, FILE_DESCRIPTOR_SET};
use crate::internal::database::provider::Connection;
use crate::plugin::RunContext;

struct RhombusImpl {
    db: Connection,
    root_key: Option<String>,
}

#[tonic::async_trait]
impl Rhombus for RhombusImpl {
    async fn whoami(
        &self,
        request: tonic::Request<proto::WhoamiRequest>,
    ) -> std::result::Result<tonic::Response<WhoamiReply>, tonic::Status> {
        let (metadata, _, _) = request.into_parts();
        let key = metadata
            .get("authorization")
            .and_then(|s| s.to_str().ok())
            .map(|s| s.trim_start_matches("bearer "))
            .map(|s| s.trim_start_matches("Bearer "))
            .ok_or_else(|| tonic::Status::unauthenticated("Missing authorization header"))?;

        if self
            .root_key
            .as_ref()
            .is_some_and(|root_key| key == root_key)
        {
            return Ok(tonic::Response::new(WhoamiReply {
                whoami: Some(Whoami::Root(())),
            }));
        }

        let user = self
            .db
            .get_user_from_api_key(key)
            .await
            .map_err(|_| tonic::Status::unauthenticated("Invalid api key"))?;

        Ok(tonic::Response::new(WhoamiReply {
            whoami: Some(Whoami::User(User {
                id: user.id,
                name: user.name.clone(),
                is_admin: user.is_admin,
            })),
        }))
    }
}

pub async fn init_grpc<'a>(run_context: &mut RunContext<'a>) {
    let greeter = RhombusImpl {
        db: run_context.db.clone(),
        root_key: run_context.settings.read().await.root_api_key.clone(),
    };
    run_context
        .grpc_builder
        .add_service(RhombusServer::new(greeter));
    run_context
        .grpc_builder
        .register_encoded_file_descriptor_set(FILE_DESCRIPTOR_SET);
}
