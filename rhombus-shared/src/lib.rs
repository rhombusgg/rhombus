#![deny(unused_crate_dependencies)]
pub mod challenges;
pub mod errors;

pub mod proto {
    tonic::include_proto!("rhombus");
}
