pub mod challenges;
pub mod errors;

pub mod proto {
    tonic::include_proto!("rhombus");
    pub const FILE_DESCRIPTOR_SET: &[u8] =
        tonic::include_file_descriptor_set!("rhombus_descriptor");
}
