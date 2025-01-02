use anyhow::{anyhow, Context, Result};

use crate::{
    get_client_from_config,
    grpc::proto::{whoami_reply::Whoami, WhoamiRequest},
    Config,
};

#[derive(clap::Parser, Debug)]
pub struct AuthCommand;

impl AuthCommand {
    pub async fn run(&self) -> Result<()> {
        let api_key = inquire::Password::new("API key?")
            .with_help_message("Get it from your account page")
            .with_display_mode(inquire::PasswordDisplayMode::Masked)
            .without_confirmation()
            .prompt()?;

        // Generated api tokens have the url base32 encoded before an underscore
        let url = api_key
            .split_once('_')
            .and_then(|(location_url_base32, _)| {
                base32::decode(
                    base32::Alphabet::Rfc4648Lower { padding: false },
                    location_url_base32,
                )
            })
            .and_then(|bytes| String::from_utf8(bytes).ok())
            .filter(|url| url.starts_with("https://") || url.starts_with("http://"));

        let url = match url {
            Some(url) => {
                println!("✓ URL: {}", url);
                url
            }
            None => inquire::prompt_text("URL?")?,
        };

        let config = Config { url, api_key };

        let mut client = get_client_from_config(&config).await?;

        let response = client.whoami(WhoamiRequest {}).await?;
        match response.into_inner().whoami {
            Some(Whoami::Root(())) => println!("✓ Authenticated as root"),
            Some(Whoami::User(user)) => println!(
                "✓ Authenticated as '{}'{}",
                user.name,
                user.is_admin.then_some(" (admin)").unwrap_or_default()
            ),
            None => Err(anyhow!("invalid response from server"))?,
        }

        std::fs::write("rhombus-cli.yaml", serde_yml::to_string(&config)?)
            .context("failed to write rhombus-cli.yaml")?;

        println!("✓ Created rhombus-cli.yaml");

        Ok(())
    }
}
