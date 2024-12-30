use crate::grpc::proto::rhombus_server::{Rhombus, RhombusServer};
use crate::grpc::proto::{self, FILE_DESCRIPTOR_SET};
use crate::internal::database::provider::Connection;
use crate::plugin::RunContext;

struct MyGreeter {
    db: Connection,
    api_key: Option<String>,
}

#[tonic::async_trait]
impl Rhombus for MyGreeter {
    async fn whoami(
        &self,
        request: tonic::Request<proto::WhoamiRequest>,
    ) -> std::result::Result<tonic::Response<proto::WhoamiReply>, tonic::Status> {
        let (metadata, _, _) = request.into_parts();
        let token = metadata
            .get("authorization")
            .and_then(|s| s.to_str().ok())
            .map(|s| s.trim_start_matches("bearer "))
            .map(|s| s.trim_start_matches("Bearer "));
        println!("TOKEN: {:?}", token);
        Ok(tonic::Response::new(proto::WhoamiReply {
            whoami: Some(proto::whoami_reply::Whoami::Nobody(())),
        }))
    }
}

pub async fn init_grpc<'a>(run_context: &mut RunContext<'a>) {
    let greeter = MyGreeter {
        db: run_context.db.clone(),
        api_key: run_context.settings.read().await.api_key.clone(),
    };
    run_context
        .grpc_builder
        .add_service(RhombusServer::new(greeter));
    run_context
        .grpc_builder
        .register_encoded_file_descriptor_set(FILE_DESCRIPTOR_SET);
}
