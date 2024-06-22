use std::time::Duration;

use mail_parser::{MessageParser, MimeHeaders};
use tokio::sync::RwLock;

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
    bot: &'static Bot,
    db: Connection,
    settings: &'static RwLock<Settings>,
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

                tracing::trace!("Receiving emails from IMAP server");
                let client = imap::ClientBuilder::new(domain, port).connect().unwrap();

                let mut imap_session = client.login(username, password).map_err(|e| e.0).unwrap();

                imap_session.select(&inbox).unwrap();

                let new_emails = imap_session.search("NOT SEEN").unwrap();
                for id in new_emails.iter() {
                    let fetches = imap_session.fetch(id.to_string(), "RFC822").unwrap();
                    for fetch in fetches.iter() {
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
                            f.first().map(|f| {
                                format!(
                                    "{} <{}>",
                                    f.name().unwrap_or(""),
                                    f.address().unwrap_or("")
                                )
                            })
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

                imap_session.logout().unwrap();

                tokio::time::sleep(poll_interval).await;
            }
        });

        Ok(())
    }
}
