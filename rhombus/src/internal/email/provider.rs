use crate::Result;
use axum::async_trait;

#[async_trait]
pub trait EmailProvider {
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
