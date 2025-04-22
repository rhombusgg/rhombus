use std::process::Command;

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
    } else {
        println!("cargo::warning=deno cli not found, not building static assets like CSS and JS");
    }
}

fn is_in_path(command: &str) -> bool {
    Command::new("which")
        .arg(command)
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}
