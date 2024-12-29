use anyhow::{anyhow, Context, Result};
use clap::{Parser, Subcommand};
use figment::{
    providers::{Format, Yaml},
    Figment,
};
use grpc::proto::rhombus_client::RhombusClient;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tonic::{
    metadata::MetadataValue,
    service::{interceptor::InterceptedService, Interceptor},
    transport::Channel,
    Status,
};
mod admin;

mod grpc {
    pub mod proto {
        // tonic::include_proto!("rhombus");
        include!("./rhombus.rs");
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
    Admin {
        #[command(subcommand)]
        admin_command: AdminCommand,
    },
}

#[derive(Subcommand, Debug)]
enum AdminCommand {
    Apply(admin::ApplyCommand),
}

impl AdminCommand {
    async fn run(&self) -> Result<()> {
        let mut client = get_client().await?;
        match self {
            AdminCommand::Apply(apply_command) => apply_command.run(&mut client).await,
        }
    }
}

#[derive(Serialize, Deserialize)]
struct Config {
    grpc_url: String,
    auth_token: String,
}

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();

    match args.command {
        Command::Admin { admin_command } => {
            admin_command.run().await?;
        }
    }

    Ok(())
}

struct MyInterceptor {
    auth_token: MetadataValue<tonic::metadata::Ascii>,
}

impl Interceptor for MyInterceptor {
    fn call(&mut self, mut request: tonic::Request<()>) -> Result<tonic::Request<()>, Status> {
        request
            .metadata_mut()
            .insert("authorization", self.auth_token.clone());

        Ok(request)
    }
}

type Client = RhombusClient<InterceptedService<Channel, MyInterceptor>>;

async fn get_client() -> Result<Client> {
    let config_file = find_config_file()?;
    let config: Config = Figment::new()
        .merge(Yaml::file_exact(&config_file))
        .extract()
        .with_context(|| format!("failed to load config file ({})", config_file.display()))?;
    let auth_token: MetadataValue<_> = config.auth_token.parse()?;
    let channel = Channel::from_shared(config.grpc_url.clone())
        .with_context(|| format!("failed to parse grpc url '{}'", &config.grpc_url))?
        .connect()
        .await
        .with_context(|| format!("failed to connect to grpc server '{}'", &config.grpc_url))?;
    let client = RhombusClient::with_interceptor(channel, MyInterceptor { auth_token });
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
