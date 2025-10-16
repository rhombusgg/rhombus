use async_trait::async_trait;

use crate::Result;

#[async_trait]
pub trait OutboundEmailProvider {
    async fn send_email(
        &self,
        to: &str,
        subject: &str,
        plaintext: &str,
        html: &str,
        in_reply_to: Option<&str>,
        references: &[String],
    ) -> Result<String>;
}

#[allow(async_fn_in_trait, dead_code)]
pub trait InboundEmail {
    async fn receive_emails(&self) -> Result<()>;
}
