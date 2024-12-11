use std::process::Command;

use rustc_version::{version_meta, Channel};

fn main() {
    // trigger recompilation when a new migration is added
    println!("cargo:rerun-if-changed=fonts");
    println!("cargo:rerun-if-changed=locales");
    println!("cargo:rerun-if-changed=migrations");
    println!("cargo:rerun-if-changed=static");

    Command::new("deno")
        .arg("install")
        .spawn()
        .expect("Failed to run deno install");

    Command::new("deno")
        .args([
            "run",
            "-A",
            "npm:@tailwindcss/cli",
            "--minify",
            "--input",
            "app.css",
            "--output",
            "static/rhombus.css",
        ])
        .spawn()
        .expect("Failed to run tailwindcss");

    Command::new("deno")
        .args(["run", "-A", "build.mjs"])
        .spawn()
        .expect("Failed to run js build");

    let channel = match version_meta().unwrap().channel {
        Channel::Stable => "CHANNEL_STABLE",
        Channel::Beta => "CHANNEL_BETA",
        Channel::Nightly => "CHANNEL_NIGHTLY",
        Channel::Dev => "CHANNEL_DEV",
    };
    println!("cargo:rustc-cfg={}", channel)
}
