use crate::get_client;
use anyhow::Result;
use clap::Subcommand;
use rand::{
    distributions::{Alphanumeric, DistString},
    thread_rng,
};
use reqwest::Body;
use rhombus_shared::challenges::{
    diff_challenges, load_challenges, update_challenges_request, upload_files,
    AttachmentIntermediate, ChallengeIntermediate, ChallengesIntermediate,
};
use rhombus_shared::proto::GetChallengesAdminRequest;
use std::{
    collections::BTreeMap,
    path::{Path, PathBuf},
};
use tokio::fs::File;
use tokio_util::codec::{BytesCodec, FramedRead};

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
            .client
            .get_challenges_admin(GetChallengesAdminRequest {})
            .await?
            .into_inner();

        let old_challenges = ChallengesIntermediate {
            challenges: response
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
                                .map(AttachmentIntermediate::Literal)
                                .collect(),
                            flag: challenge.flag,
                            healthscript: challenge.healthscript,
                            name: challenge.name,
                            ticket_template: challenge.ticket_template,
                            metadata: serde_json::from_str(&challenge.metadata).unwrap_or_default(),
                            score_type: challenge.score_type,
                        },
                    )
                })
                .collect::<BTreeMap<_, _>>(),
            authors: response
                .authors
                .into_iter()
                .map(|author| (author.id.clone(), author))
                .collect(),
            categories: response
                .categories
                .into_iter()
                .map(|category| (category.id.clone(), category))
                .collect(),
        };

        let difference = diff_challenges(&old_challenges, &new_challenges);

        if difference.is_empty() {
            println!("Already up to date");
            return Ok(());
        }

        // TODO: Print better
        println!("{:#?}", difference);

        if !inquire::prompt_confirmation("Apply changes?")? {
            println!("✗ Aborted");
            return Ok(());
        }

        let uploaded_files = upload_files(&difference, |upload| {
            let upload = upload.clone();
            let client = &client;
            async move { upload_file(&upload.name, &upload.path, &client.url, &client.key).await }
        })
        .await?;

        let request = update_challenges_request(&difference, &uploaded_files);

        client.client.update_challenges(request).await?;
        println!("✓ Changes applied");

        Ok(())
    }
}

pub async fn upload_file(name: &str, path: &Path, location_url: &str, key: &str) -> Result<String> {
    let url = format!("{}/upload/{}", location_url, urlencoding::encode(name));
    let file = File::open(path).await?;
    let body = Body::wrap_stream(FramedRead::new(file, BytesCodec::new()));
    let client = reqwest::Client::new();
    let response = client.post(url).bearer_auth(key).body(body).send().await?;
    let uploaded_url = response.text().await?;
    Ok(uploaded_url)
}
