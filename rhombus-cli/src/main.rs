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
use std::{path::PathBuf, process::exit};
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
struct Config {
    url: String,
    api_key: String,
}

#[tokio::main]
async fn main() {
    let args = Args::parse();

    let result = match args.command {
        Command::Admin { admin_command } => admin_command.run().await,
        Command::Auth(auth_command) => auth_command.run().await,
    };

    match result {
        Ok(()) => {}
        Err(err) => {
            match err.source() {
                Some(source) => println!("{}", format!("Error: {}: {}", err, source).red()),
                None => println!("{}{}", "Error: ".red(), err.to_string().red()),
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
    let config_file = find_config_file()?;
    let config: Config = Figment::new()
        .merge(Yaml::file_exact(&config_file))
        .extract()
        .with_context(|| format!("failed to load config file ({})", config_file.display()))?;
    get_client_from_config(&config).await
}

async fn get_client_from_config(config: &Config) -> Result<Client> {
    let auth_token: MetadataValue<_> = config.api_key.parse()?;
    let channel = Channel::from_shared(config.url.clone())
        .with_context(|| format!("failed to parse grpc url '{}'", &config.url))?
        .connect()
        .await
        .with_context(|| format!("failed to connect to grpc server '{}'", &config.url))?;
    let client = RhombusClient::with_interceptor(channel, AuthInterceptor { auth_token });
    Ok(client)
}

fn find_config_file() -> Result<PathBuf> {
    for p in std::env::current_dir()?.ancestors() {
        if p.join("rhombus-cli.yaml").is_file() {
            return Ok(p.join("rhombus-cli.yaml").to_owned());
        }
    }
    Err(anyhow!(
        "failed to find rhombus-cli.yaml. Run rhombus-cli auth"
    ))
}
