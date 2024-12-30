use anyhow::Result;

#[derive(clap::Parser, Debug)]
pub struct AuthCommand;

impl AuthCommand {
    pub async fn run(&self) -> Result<()> {
        let api_token = inquire::Password::new("API token?")
            .with_help_message("Get it from your account page")
            .prompt()?;

        Ok(())
    }
}
