fn main() {
    tonic_build::configure()
        .compile_protos(&["../proto/rhombus.proto"], &["../proto"])
        .unwrap();
}
