use crate::Client;
use anyhow::Result;

#[derive(clap::Parser, Debug)]
pub struct ApplyCommand {}

impl ApplyCommand {
    pub async fn run(&self, _client: &mut Client) -> Result<()> {
        println!("todo");
        Ok(())
    }
}
