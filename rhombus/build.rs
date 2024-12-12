use std::process::Command;

use rustc_version::{version_meta, Channel};

fn main() {
    println!("cargo:rerun-if-changed=fonts");
    println!("cargo:rerun-if-changed=locales");
    println!("cargo:rerun-if-changed=migrations");
    println!("cargo:rerun-if-changed=static");

    if is_in_path("deno") {
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
    }

    let channel = match version_meta().unwrap().channel {
        Channel::Stable => "CHANNEL_STABLE",
        Channel::Beta => "CHANNEL_BETA",
        Channel::Nightly => "CHANNEL_NIGHTLY",
        Channel::Dev => "CHANNEL_DEV",
    };
    println!("cargo:rustc-cfg={}", channel)
}

fn is_in_path(command: &str) -> bool {
    Command::new("which")
        .arg(command)
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}
