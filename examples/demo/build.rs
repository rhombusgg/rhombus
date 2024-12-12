use std::process::Command;

fn main() {
    let app_css = rhombus_build::Assets::get("app.css").unwrap();
    std::fs::write("rhombus.css", app_css.data).unwrap();

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
                "static/demo.css",
            ])
            .spawn()
            .expect("Failed to run tailwindcss");
    }

    println!("cargo:rerun-if-changed=static");
    println!("cargo:rerun-if-changed=app.css");
}

fn is_in_path(command: &str) -> bool {
    Command::new("which")
        .arg(command)
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}
