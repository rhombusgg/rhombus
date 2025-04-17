# Getting Started

## Try It Online

You can try it online to get a feel for the platform on the [official hosted demo](https://demo.rhombus.gg).

::: warning 🚧 COMING SOON 🚧
CodeSandbox standalone example.
:::

## Configuration

The core of Rhombus is configured in `yaml` and with environment variables. There is a JSON schema available for validation and autocomplete.

::: code-group

```yaml [config.yaml]
# yaml-language-server: $schema=https://raw.githubusercontent.com/rhombusgg/rhombus/main/schema.json
title: Rhombus Demo
location_url: http://localhost:3000
contact_email: demo@rhombus.gg
# Generate with rhombus-cli admin generate-api-key
root_api_key: nb2hi4b2f4xwy33dmfwgq33toq5dgmbqga_T59hPTa7PNXzIsaiPFBB8JO3jyWcL1yW
auth:
  - credentials
divisions:
  - name: Open
    description: Open division for everyone
  - name: University
    description: University students globally
    email_regex: ^.*.edu$
    requirement: Must verify a valid university .edu email address. Max of up to 4 players
    max_players: 4
logo: |
  <svg
    style="width: 2.25rem"
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="lucide lucide-construction"
  >
    <rect x="2" y="6" width="20" height="8" rx="1" />
    <path d="M17 14v7" />
    <path d="M7 14v7" />
    <path d="M17 3v3" />
    <path d="M7 3v3" />
    <path d="M10 14 2.3 6.3" />
    <path d="m14 6 7.7 7.7" />
    <path d="m8 6 8 8" />
  </svg>
home:
  content: |
    # My CTF

    This is a *markdown* and <b>HTML</b> supported field where you can:
    - Have a countdown to the time the CTF will start/end
    - Tell users about your CTF
    - Include rules/sponsors
    - Anything else! 🚀
```

:::

Environment variables are the exact same keys as in `yaml`, but in all caps, and prefixed by `RHOMBUS__`. Nested keys are separated by `__` (two underscores). For example,

```bash
RHOMBUS__JWT_SECRET="my-super-secret-jwt-secret"
RHOMBUS__HOME__CONTENT="# My CTF"
```

> [!NOTE] > `json` and `toml` files are also supported, but the documentation is standardized on `yaml`

## Standalone Binary

## With Plugins

::: warning 🚧 COMING SOON 🚧
Use `rhombus-cli ctf init` to quickly bootstrap a custom CTF with plugins.
:::

Rhombus is implemented as a [Rust library](https://crates.io/crates/rhombus), with plugins also implemented as other Rust libraries. [Learn more about plugins.](/docs/plugins/) Therefore, mixing in plugins on your instance is exactly like writing a program in Rust.

### Install Rust Toolchain

On most systems it is recommended to use the [rustup](https://rust-lang.org/tools/install), the official rust installer.

```sh
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### Create Project

`cd` into the directory you want to initialize your project with `cargo`

```
cargo init
```

Then, add the following dependencies to your `Cargo.toml`

::: code-group

```toml [Cargo.toml]
[dependencies]
rhombus = { version = "0.1.0", features = ["libsql"] }
tokio = { version = "1.37.0", features = ["full"] }
tracing-subscriber = { version = "0.3.18", features = ["env-filter"] }
```

:::

Depending on your desired [database backend](/docs/database/) you will need to enable different `features` for `rhombus`. We will use `libsql` here to get started by using a local SQLite database with zero configuration required.

Now, edit `src/main.rs` to contain the following code

::: code-group

```rust {8-12} [src/main.rs]
#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let app = rhombus::Builder::default()
        .load_env()
        .config_source(rhombus::config::File::with_name("config"))
        .plugin(
            rhombus::challenge_loader_plugin::ChallengeLoaderPlugin::new(std::path::Path::new(
                "challenges",
            )),
        )
        .build()
        .await
        .unwrap();

    let listener = tokio::net::TcpListener::bind(":::3000").await.unwrap();
    rhombus::axum::serve(
        listener,
        app.into_make_service_with_connect_info::<std::net::SocketAddr>(),
    )
    .await
    .unwrap();
}
```

:::

In the highlighted section, notice the 1st party [Challenge Loader Plugin](/docs/challenges) being loaded into the Rhombus instance. To add your own plugins, add them as dependencies to your Rust project (in the `Cargo.toml`), and make more calls to `.plugin` on the Rhombus builder.
