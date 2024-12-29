use std::{env, path::PathBuf};

fn main() {
    let app_css = rhombus_build::Assets::get("app.css").unwrap();
    std::fs::write("rhombus.css", app_css.data).unwrap();

    let out_dir = PathBuf::from(env::var("OUT_DIR").unwrap());

    tonic_build::configure()
        .file_descriptor_set_path(out_dir.join("myplugin_descriptor.bin"))
        .compile_protos(&["./proto/myplugin.proto"], &["./proto"])
        .unwrap();
}
