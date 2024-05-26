use crate::Result;
use axum::async_trait;

#[async_trait]
pub trait EmailProvider {
    async fn send_email(
        &self,
        to: &str,
        subject: &str,
        plaintext: String,
        html: String,
    ) -> Result<()>;
}
