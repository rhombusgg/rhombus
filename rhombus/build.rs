use std::process::Command;
use std::{env, path::PathBuf};

fn main() {
    println!("cargo:rerun-if-changed=fonts");
    println!("cargo:rerun-if-changed=locales");
    println!("cargo:rerun-if-changed=migrations");
    println!("cargo:rerun-if-changed=static");

    eprintln!("OUT_DIR={}", env::var("OUT_DIR").unwrap());

    let out_dir = PathBuf::from(env::var("OUT_DIR").unwrap());
    tonic_build::configure()
        .file_descriptor_set_path(out_dir.join("rhombus_descriptor.bin"))
        .compile_protos(&["../proto/rhombus.proto"], &["../proto"])
        .unwrap();

    if is_in_path("deno") {
        Command::new("deno")
            .arg("install")
            .spawn()
            .expect("Failed to run deno install");

        Command::new("deno")
            .args([
                "run",
                "-A",
                "npm:@tailwindcss/cli@^4.0.0-beta.6",
                "--minify",
                "--input",
                "app.css",
                "--output",
                "static/rhombus.css",
            ])
            .spawn()
            .expect("Failed to run tailwindcss");

        Command::new("deno")
            .args(["run", "-A", "build.ts"])
            .spawn()
            .expect("Failed to run js build");
    }
}

fn is_in_path(command: &str) -> bool {
    Command::new("which")
        .arg(command)
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}
