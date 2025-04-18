pub mod challenges;

use std::path::PathBuf;

use anyhow::{anyhow, Result};
use challenges::apply_challenges;
use clap::Subcommand;
use rand::{
    distributions::{Alphanumeric, DistString},
    thread_rng,
};

#[derive(Subcommand, Debug)]
pub enum AdminCommand {
    /// Apply the change you have made to challenges to the Rhombus server.
    Apply(ApplyCommand),
    /// Generate an random API key with an embedded URL to use as the root_api_key in a Rhombus config.
    GenerateApiKey(GenerateApiKeyCommand),
}

impl AdminCommand {
    pub async fn run(&self) -> Result<()> {
        match self {
            AdminCommand::Apply(apply_command) => apply_command.run().await,
            AdminCommand::GenerateApiKey(generate_api_key_command) => {
                generate_api_key_command.run().await
            }
        }
    }
}

#[derive(clap::Parser, Debug)]
pub struct GenerateApiKeyCommand {
    #[arg(short, long)]
    url: Option<String>,
}

impl GenerateApiKeyCommand {
    pub async fn run(&self) -> Result<()> {
        let url = match &self.url {
            Some(url) => url.clone(),
            None => inquire::prompt_text("Rhombus URL?")?,
        };
        println!(
            "{}_{}",
            base32::encode(
                base32::Alphabet::Rfc4648Lower { padding: false },
                url.as_bytes()
            ),
            Alphanumeric.sample_string(&mut thread_rng(), 32)
        );
        Ok(())
    }
}

#[derive(clap::Parser, Debug)]
pub struct ApplyCommand {}

impl ApplyCommand {
    pub async fn run(&self) -> Result<()> {
        apply_challenges(&PathBuf::from("loader.yaml")).await?;
        Ok(())
    }
}
