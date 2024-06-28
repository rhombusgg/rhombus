use std::{sync::Arc, time::Duration};

use futures::TryStreamExt;
use mail_parser::{MessageParser, MimeHeaders};
use thiserror::Error;
use tokio::sync::RwLock;
use tokio_rustls::{
    rustls::{
        pki_types::{self, InvalidDnsNameError},
        ClientConfig, RootCertStore,
    },
    TlsConnector,
};

use crate::{
    internal::{
        database::provider::Connection,
        discord::{Bot, DiscordAttachment},
        email::{provider::InboundEmail, reply_parser},
        settings::Settings,
    },
    Result,
};

pub struct ImapEmailReciever {
    pub settings: &'static RwLock<Settings>,
    pub bot: &'static Bot,
    pub db: Connection,
}

impl ImapEmailReciever {
    pub fn new(settings: &'static RwLock<Settings>, bot: &'static Bot, db: Connection) -> Self {
        ImapEmailReciever { settings, bot, db }
    }
}

impl InboundEmail for ImapEmailReciever {
    async fn receive_emails(&self) -> Result<()> {
        let db = self.db;
        let bot = self.bot;
        let settings = self.settings;

        tokio::task::spawn(async move {
            loop {
                if let Err(e) = receive_emails(bot, db, settings).await {
                    tracing::error!(error = ?e, "Failed to receive emails");
                }
            }
        });

        Ok(())
    }
}

#[derive(Error, Debug)]
pub enum ImapError {
    #[error("Failed to connect to io stream")]
    TcpStream(#[from] tokio::io::Error),

    #[error("Invalid DNS name")]
    InvalidDnsNameError(#[from] InvalidDnsNameError),

    #[error("IMAP error")]
    Imap(#[from] async_imap::error::Error),
}

async fn receive_emails(
    bot: &'static Bot,
    db: Connection,
    settings: &'static RwLock<Settings>,
) -> std::result::Result<(), ImapError> {
    let (username, password, domain, port, poll_interval, inbox) = {
        let settings = settings.read().await;
        let settings = settings.email.as_ref().unwrap().imap.as_ref().unwrap();
        (
            settings.username.clone(),
            settings.password.clone(),
            settings.domain.clone(),
            settings.port.unwrap_or(993),
            Duration::from_secs(settings.poll_interval.unwrap_or(30)),
            settings.inbox.clone().unwrap_or("INBOX".to_string()),
        )
    };

    let server_name = pki_types::ServerName::try_from(domain.as_str().to_owned())?;

    let tcp_stream = tokio::net::TcpStream::connect((domain.as_str(), port)).await?;

    let mut root_cert_store = RootCertStore::empty();
    root_cert_store.extend(webpki_roots::TLS_SERVER_ROOTS.iter().cloned());
    let config = ClientConfig::builder()
        .with_root_certificates(root_cert_store)
        .with_no_client_auth();
    let connector = TlsConnector::from(Arc::new(config));
    let tls_stream = connector.connect(server_name, tcp_stream).await?;

    let client = async_imap::Client::new(tls_stream);

    let mut imap_session = client.login(username, password).await.map_err(|e| e.0)?;

    imap_session.select(&inbox).await?;

    let new_emails = imap_session.search("NOT SEEN").await?;

    if !new_emails.is_empty() {
        tracing::trace!(
            count = new_emails.len(),
            "Receiving emails from IMAP server"
        );
    }

    for id in new_emails.iter() {
        let fetches: Vec<_> = imap_session
            .fetch(id.to_string(), "RFC822")
            .await?
            .try_collect()
            .await?;
        for fetch in fetches {
            let Some(text) = fetch.body() else {
                tracing::error!("No body found in email");
                continue;
            };
            let Some(message) = MessageParser::default().parse(text) else {
                tracing::error!("Failed to parse email");
                continue;
            };

            let Some(&in_reply_to) = message
                .in_reply_to()
                .as_text_list()
                .as_ref()
                .and_then(|l| l.first())
            else {
                tracing::error!("No in-reply-to header found");
                continue;
            };

            let Some(text) = message.body_text(0) else {
                tracing::error!("No body text found");
                continue;
            };

            let main_message = reply_parser::visible_text(&text);

            let Ok(ticket_number) = db
                .get_ticket_number_by_message_id(&format!("<{}>", in_reply_to))
                .await
            else {
                tracing::error!(in_reply_to, "Failed to find ticket number");
                continue;
            };

            let Ok(ticket) = db.get_ticket_by_ticket_number(ticket_number).await else {
                tracing::error!(ticket_number, "Failed to find ticket");
                continue;
            };

            let Ok(user) = db.get_user_from_id(ticket.user_id).await else {
                tracing::error!(ticket.user_id, "Failed to find user");
                continue;
            };

            let from = message.from().and_then(|f| {
                f.first()
                    .map(|f| format!("{} <{}>", f.name().unwrap_or(""), f.address().unwrap_or("")))
            });

            let attachments = message
                .attachments()
                .map(|a| DiscordAttachment {
                    data: a.contents(),
                    filename: a.attachment_name().unwrap_or("undefined"), // for the lols
                })
                .collect::<Vec<_>>();

            if bot
                .send_external_ticket_message(
                    ticket.discord_channel_id,
                    &user,
                    from.as_deref(),
                    &main_message,
                    &attachments,
                )
                .await
                .is_err()
            {
                tracing::error!("Failed to send external ticket message");
            }
        }
    }

    imap_session.logout().await?;

    tokio::time::sleep(poll_interval).await;

    Ok(())
}
