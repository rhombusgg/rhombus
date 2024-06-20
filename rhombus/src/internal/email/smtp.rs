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
        plaintext: &str,
        html: &str,
        in_reply_to: Option<&str>,
        references: &[String],
    ) -> Result<String> {
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
            .message_id(None);

        let message = if let Some(in_reply_to) = in_reply_to {
            message.in_reply_to(in_reply_to.to_owned())
        } else {
            message
        };

        let message = if !references.is_empty() {
            message.references(references.join(" "))
        } else {
            message
        };

        let message = message.multipart(MultiPart::alternative_plain_html(
            plaintext.to_owned(),
            html.to_owned(),
        ))?;

        let message_id = message.headers().get_raw("Message-ID").unwrap().to_owned();

        _ = self.transport.send(message).await?;

        Ok(message_id)
    }
}
