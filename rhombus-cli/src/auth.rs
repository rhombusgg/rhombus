use std::{fs::create_dir_all, path::Path};

use anyhow::{anyhow, Context, Result};

use crate::{
    config::read_project_config,
    config::read_secret_config,
    config::ProjectConfigYaml,
    config::SecretConfigYaml,
    connect,
    grpc::proto::{whoami_reply::Whoami, WhoamiRequest},
};

#[derive(clap::Parser, Debug)]
pub struct AuthCommand;

impl AuthCommand {
    pub async fn run(&self) -> Result<()> {
        let mut secret_config = read_secret_config()?;
        let project_config = read_project_config().ok();

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
            None => inquire::prompt_text("CTF URL?")?,
        };

        if let Some(ref project_config) = project_config {
            if &project_config.url != &url {
                return Err(anyhow!(
                    "API key url ('{}') does not match project config url ('{}')",
                    &url,
                    &project_config.url
                ))?;
            }
        }

        let mut client = connect(&url, &api_key).await?;

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

        match project_config {
            Some(project_config) => {
                println!(
                    "✓ Project config exists at {}",
                    project_config.path.display()
                );
            }
            None => {
                let home_dir = directories::UserDirs::new().map(|p| p.home_dir().to_owned());
                let default_project_config_dir = Path::new(".")
                    .canonicalize()
                    .ok()
                    .and_then(|p| {
                        p.ancestors()
                            .find(|p| p.join(".git").is_dir())
                            .map(|p| p.to_owned())
                    })
                    .and_then(|p| p.canonicalize().ok())
                    .filter(|p| Some(p.as_path()) != home_dir.as_deref())
                    .map(|s| s.as_os_str().to_string_lossy().to_string())
                    .unwrap_or(".".to_owned());

                let project_config_dir = inquire::Text::new("Directory to write project config?")
                    .with_initial_value(&default_project_config_dir)
                    .prompt()?;

                let project_config_path = Path::new(&project_config_dir).join("rhombus-cli.yaml");
                std::fs::write(
                    &project_config_path,
                    serde_yml::to_string(&ProjectConfigYaml { url: url.clone() })?,
                )
                .with_context(|| format!("failed to write {}", project_config_path.display()))?;
                println!("✓ Created project config {}", project_config_path.display());
            }
        }
        secret_config.keys.insert(url.clone(), api_key);

        let secret_config_path = secret_config.path.to_owned();
        let secret_config_yaml: SecretConfigYaml = secret_config.into();
        create_dir_all(secret_config_path.parent().unwrap()).with_context(|| {
            format!(
                "failed to create directory {}",
                secret_config_path.parent().unwrap().display()
            )
        })?;
        std::fs::write(
            &secret_config_path,
            serde_yml::to_string(&secret_config_yaml)?,
        )
        .with_context(|| format!("failed to write {}", secret_config_path.display()))?;

        println!("✓ Wrote API key to {}", secret_config_path.display());

        Ok(())
    }
}
