use async_trait::async_trait;
use lettre::{message::MultiPart, AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor};
use tokio::sync::RwLock;

use crate::{
    internal::{email::provider::EmailProvider, settings::Settings},
    Result,
};

pub struct SmtpProvider {
    pub transport: AsyncSmtpTransport<Tokio1Executor>,
    pub settings: &'static RwLock<Settings>,
}

impl SmtpProvider {
    pub async fn new(settings: &'static RwLock<Settings>) -> Result<Self> {
        let connection_url = {
            settings
                .read()
                .await
                .email
                .as_ref()
                .unwrap()
                .connection_url
                .clone()
        };
        let transport = AsyncSmtpTransport::<Tokio1Executor>::from_url(&connection_url)?.build();
        Ok(Self {
            transport,
            settings,
        })
    }
}

#[async_trait]
impl EmailProvider for SmtpProvider {
    async fn send_email(
        &self,
        to: &str,
        subject: &str,
        plaintext: String,
        html: String,
    ) -> Result<()> {
        let from = {
            self.settings
                .read()
                .await
                .email
                .as_ref()
                .unwrap()
                .from
                .clone()
        };

        let message = Message::builder()
            .from(from.parse()?)
            .to(to.parse()?)
            .subject(subject)
            .multipart(MultiPart::alternative_plain_html(plaintext, html))?;

        _ = self.transport.send(message).await?;

        Ok(())
    }
}
