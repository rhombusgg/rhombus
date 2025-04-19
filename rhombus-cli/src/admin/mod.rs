use crate::get_client;
use anyhow::{anyhow, Result};
use clap::Subcommand;
use rand::{
    distributions::{Alphanumeric, DistString},
    thread_rng,
};
use rhombus_shared::challenges::{
    diff_challenges, load_challenges, AttachmentIntermediate, ChallengeIntermediate,
};
use rhombus_shared::proto::GetChallengesAdminRequest;
use std::{collections::BTreeMap, path::PathBuf};

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
        let mut client = get_client().await?;
        let new_challenges = load_challenges(&PathBuf::from("loader.yaml")).await?;

        let response = client
            .get_challenges_admin(GetChallengesAdminRequest {})
            .await?
            .into_inner();

        let old_challenges = response
            .challenges
            .into_iter()
            .map(|challenge| {
                (
                    challenge.id.clone(),
                    ChallengeIntermediate {
                        stable_id: challenge.id,
                        author: challenge.author,
                        category: challenge.category,
                        description: challenge.description,
                        files: challenge
                            .attachments
                            .into_iter()
                            .map(|file| AttachmentIntermediate::Literal(file))
                            .collect(),
                        flag: challenge.flag,
                        healthscript: challenge.healthscript,
                        name: challenge.name,
                        ticket_template: challenge.ticket_template,
                        metadata: serde_json::from_str(&challenge.metadata).unwrap_or_default(),
                    },
                )
            })
            .collect::<BTreeMap<_, _>>();

        println!("== NEW\n{:#?}\n\n", new_challenges);
        println!("== OLD\n{:#?}\n\n", old_challenges);

        let difference = diff_challenges(&old_challenges, &new_challenges);
        println!("== DIFFERENCE\n{:#?}\n\n", difference);

        Ok(())
    }
}
