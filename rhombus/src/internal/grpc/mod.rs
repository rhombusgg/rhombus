use crate::grpc::proto::rhombus_server::{Rhombus, RhombusServer};
use crate::grpc::proto::{HelloReply, HelloRequest, FILE_DESCRIPTOR_SET};
use crate::plugin::RunContext;
use tonic::{Request, Response, Status};

use super::database::provider::Connection;

struct MyGreeter {
    db: Connection,
}

#[tonic::async_trait]
impl Rhombus for MyGreeter {
    async fn say_hello(
        &self,
        request: Request<HelloRequest>,
    ) -> Result<Response<HelloReply>, Status> {
        let challenges = self
            .db
            .get_challenges()
            .await
            .map_err(|_| Status::internal("failed to get challenges"))?;
        let reply = HelloReply {
            message: format!(
                "Hello {}! There are {} challenges.",
                request.into_inner().name,
                challenges.challenges.len()
            ),
        };

        Ok(Response::new(reply))
    }
}

pub fn init_grpc(run_context: &mut RunContext) {
    let greeter = MyGreeter {
        db: run_context.db.clone(),
    };
    run_context
        .grpc_builder
        .add_service(RhombusServer::new(greeter));
    run_context
        .grpc_builder
        .register_encoded_file_descriptor_set(FILE_DESCRIPTOR_SET);
}
