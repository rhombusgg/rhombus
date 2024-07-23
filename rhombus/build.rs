use rustc_version::{version_meta, Channel};

fn main() {
    // trigger recompilation when a new migration is added
    println!("cargo:rerun-if-changed=fonts");
    println!("cargo:rerun-if-changed=locales");
    println!("cargo:rerun-if-changed=migrations");
    println!("cargo:rerun-if-changed=static");

    let channel = match version_meta().unwrap().channel {
        Channel::Stable => "CHANNEL_STABLE",
        Channel::Beta => "CHANNEL_BETA",
        Channel::Nightly => "CHANNEL_NIGHTLY",
        Channel::Dev => "CHANNEL_DEV",
    };
    println!("cargo:rustc-cfg={}", channel)
}
