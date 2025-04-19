#![deny(unused_crate_dependencies)]
use admin::AdminCommand;
use anyhow::{anyhow, Context, Result};
use clap::{Parser, Subcommand};
use colored::Colorize;
use config::{read_project_config, read_secret_config};
use rhombus_shared::proto::rhombus_client::RhombusClient;
use std::process::exit;
use tonic::{
    metadata::MetadataValue,
    service::{interceptor::InterceptedService, Interceptor},
    transport::Channel,
    Status,
};

mod admin;
mod auth;
mod config;

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

struct ClientInfo {
    pub client: Client,
    pub key: String,
    pub url: String,
}

#[allow(dead_code)]
/// Load the rhombus-cli.yaml config file and connect to the grpc server to which it refers
async fn get_client() -> Result<ClientInfo> {
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

async fn connect(url: &str, key: &str) -> Result<ClientInfo> {
    let auth_token: MetadataValue<_> = key.parse()?;
    let channel = Channel::from_shared(url.to_owned())
        .with_context(|| format!("failed to parse grpc url '{}'", url))?
        .connect()
        .await
        .with_context(|| format!("failed to connect to grpc server '{}'", url))?;
    let client = RhombusClient::with_interceptor(channel, AuthInterceptor { auth_token });
    Ok(ClientInfo {
        client,
        key: key.to_owned(),
        url: url.to_owned(),
    })
}
