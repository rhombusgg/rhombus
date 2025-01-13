use admin::AdminCommand;
use anyhow::{anyhow, Context, Result};
use clap::{Parser, Subcommand};
use colored::Colorize;
use figment::{
    providers::{Format, Yaml},
    Figment,
};
use grpc::proto::rhombus_client::RhombusClient;
use serde::{Deserialize, Serialize};
use std::{collections::BTreeMap, path::PathBuf, process::exit};
use tonic::{
    metadata::MetadataValue,
    service::{interceptor::InterceptedService, Interceptor},
    transport::Channel,
    Status,
};
mod admin;
mod auth;

mod grpc {
    pub mod proto {
        tonic::include_proto!("rhombus");
    }
}

#[derive(Parser, Debug)]
#[command(version, about, long_about = None)]
struct Args {
    #[command(subcommand)]
    command: Command,
}
#[derive(Subcommand, Debug)]
enum Command {
    /// Authentiace rhombus-cli using an API token
    Auth(auth::AuthCommand),
    /// Commands for CTF admins
    Admin {
        #[command(subcommand)]
        admin_command: AdminCommand,
    },
}

#[derive(Serialize, Deserialize)]
struct ProjectConfigYaml {
    url: String,
}

struct ProjectConfig {
    path: PathBuf,
    url: String,
}

impl Into<ProjectConfigYaml> for ProjectConfig {
    fn into(self) -> ProjectConfigYaml {
        ProjectConfigYaml { url: self.url }
    }
}

#[derive(Serialize, Deserialize)]
struct SecretConfigYaml {
    keys: Vec<UrlKeyPairYaml>,
}

#[derive(Serialize, Deserialize)]
struct UrlKeyPairYaml {
    url: String,
    key: String,
}

struct SecretConfig {
    path: PathBuf,
    keys: BTreeMap<String, String>,
}

impl Into<SecretConfigYaml> for SecretConfig {
    fn into(self) -> SecretConfigYaml {
        SecretConfigYaml {
            keys: self
                .keys
                .into_iter()
                .map(|(url, key)| UrlKeyPairYaml { url, key })
                .collect(),
        }
    }
}

#[tokio::main]
async fn main() {
    let args = Args::parse();

    let result = match args.command {
        Command::Admin { admin_command } => admin_command.run().await,
        Command::Auth(auth_command) => auth_command.run().await,
    };

    // Macro because https://github.com/rust-lang/rust/issues/112838
    macro_rules! render_error {
        ($error:expr) => {
            $error
                .downcast_ref::<tonic::Status>()
                .map(|status| format!("{}: {}", status.code().description(), status.message()))
                .unwrap_or_else(|| $error.to_string())
        };
    }

    match result {
        Ok(()) => {}
        Err(err) => {
            match err.source() {
                Some(source) => println!(
                    "{}{}{}{}",
                    "Error: ".red(),
                    err.to_string().red(),
                    ": ".red(),
                    render_error!(source).red()
                ),
                None => println!("{}{}", "Error: ".red(), render_error!(err).red()),
            }

            exit(1);
        }
    }
}

struct AuthInterceptor {
    auth_token: MetadataValue<tonic::metadata::Ascii>,
}

impl Interceptor for AuthInterceptor {
    fn call(&mut self, mut request: tonic::Request<()>) -> Result<tonic::Request<()>, Status> {
        request
            .metadata_mut()
            .insert("authorization", self.auth_token.clone());

        Ok(request)
    }
}

type Client = RhombusClient<InterceptedService<Channel, AuthInterceptor>>;

#[allow(dead_code)]
/// Load the rhombus-cli.yaml config file and connect to the grpc server to which it refers
async fn get_client() -> Result<Client> {
    let secret_config = read_secret_config()?;
    let project_config = read_project_config()?;
    let key = secret_config.keys.get(&project_config.url).ok_or_else(|| {
        anyhow!(
            "no key found for url {}. Run rhombus-cli auth",
            &project_config.url
        )
    })?;
    connect(&project_config.url, key).await
}

async fn connect(url: &str, key: &str) -> Result<Client> {
    let auth_token: MetadataValue<_> = key.parse()?;
    let channel = Channel::from_shared(url.to_owned())
        .with_context(|| format!("failed to parse grpc url '{}'", url))?
        .connect()
        .await
        .with_context(|| format!("failed to connect to grpc server '{}'", url))?;
    let client = RhombusClient::with_interceptor(channel, AuthInterceptor { auth_token });
    Ok(client)
}

fn find_project_config_file() -> Result<PathBuf> {
    for path in std::env::current_dir()?.ancestors() {
        if path.join("rhombus-cli.yaml").is_file() {
            return Ok(path.join("rhombus-cli.yaml").to_owned());
        }
    }
    Err(anyhow!(
        "failed to find rhombus-cli.yaml. Run rhombus-cli auth"
    ))
}

fn read_project_config() -> Result<ProjectConfig> {
    let path = find_project_config_file()?;
    let config: ProjectConfigYaml = Figment::new()
        .merge(Yaml::file_exact(&path))
        .extract()
        .with_context(|| format!("failed to load project config file ({})", path.display()))?;
    Ok(ProjectConfig {
        url: config.url,
        path,
    })
}

fn find_secret_config_file() -> Result<PathBuf> {
    Ok(
        directories::ProjectDirs::from("gg", "rhombus", "rhombus-cli")
            .ok_or(anyhow!("failed to find config directory"))?
            .config_dir()
            .join("config.yaml")
            .to_owned(),
    )
}

fn read_secret_config() -> Result<SecretConfig> {
    let path = find_secret_config_file()?;
    if !path.exists() {
        return Ok(SecretConfig {
            path,
            keys: BTreeMap::new(),
        });
    }
    let config: SecretConfigYaml = Figment::new()
        .merge(Yaml::file_exact(&path))
        .extract()
        .with_context(|| format!("failed to load config file ({})", path.display()))?;

    Ok(SecretConfig {
        keys: config
            .keys
            .into_iter()
            .map(|pair| (pair.url, pair.key))
            .collect(),
        path,
    })
}
