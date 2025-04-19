use crate::{get_client, ClientInfo};
use anyhow::{anyhow, Result};
use clap::Subcommand;
use futures::{stream::FuturesUnordered, StreamExt};
use rand::{
    distributions::{Alphanumeric, DistString},
    thread_rng,
};
use reqwest::Body;
use rhombus_shared::challenges::{
    diff_challenges, load_challenges, AttachmentIntermediate, AttachmentUpload,
    ChallengeIntermediate, ChallengeUpdateIntermediate,
};
use rhombus_shared::proto::GetChallengesAdminRequest;
use std::{
    collections::BTreeMap,
    path::{Path, PathBuf},
};
use tokio::{fs::File, stream};
use tokio_util::{
    bytes::Bytes,
    codec::{BytesCodec, FramedRead},
    io::ReaderStream,
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
        let mut client = get_client().await?;
        let new_challenges = load_challenges(&PathBuf::from("loader.yaml")).await?;

        let response = client
            .client
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

        let files_to_upload: BTreeMap<String, AttachmentUpload> = difference
            .iter()
            .filter_map(|update| match update {
                ChallengeUpdateIntermediate::Edit { old: _, new } => Some(new),
                ChallengeUpdateIntermediate::Create(chal) => Some(chal),
                ChallengeUpdateIntermediate::Delete { .. } => None,
            })
            .flat_map(|chal| chal.files.iter())
            .filter_map(|file| match file {
                AttachmentIntermediate::Literal(_) => None,
                AttachmentIntermediate::Upload(upload) => Some(upload),
            })
            .map(|upload| (upload.name.clone(), upload.clone()))
            .collect();

        let mut futures = FuturesUnordered::new();

        for (hash, upload) in files_to_upload {
            let url = &client.url;
            let key = &client.key;
            futures.push(async move {
                let url = upload_file(&upload.name, &upload.path, url, key).await;
                (hash, url)
            });
        }

        let mut result = BTreeMap::new();
        while let Some((k, v)) = futures.next().await {
            result.insert(k, v?);
        }

        println!("{:#?}", result);

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
