pub mod challenges;
pub mod errors;

pub mod grpc {
    pub mod proto {
        tonic::include_proto!("rhombus");
    }
}
