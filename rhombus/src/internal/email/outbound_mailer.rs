use std::{fmt::Write, sync::Arc};

use crate::{
    internal::{
        database::provider::{Connection, Ticket},
        discord::DigestMessage,
        email::provider::OutboundEmailProvider,
        settings::Settings,
    },
    Result,
};
use minijinja::{context, Environment};
use tokio::sync::RwLock;

pub struct OutboundMailer {
    pub inner: Arc<dyn OutboundEmailProvider + Send + Sync>,
    pub jinja: Arc<Environment<'static>>,
    pub settings: Arc<RwLock<Settings>>,
    pub db: Connection,
    pub logo_path: Arc<String>,
}

impl OutboundMailer {
    pub fn new(
        provider: Arc<dyn OutboundEmailProvider + Send + Sync>,
        jinja: Arc<Environment<'static>>,
        settings: Arc<RwLock<Settings>>,
        db: Connection,
        logo_path: &str,
    ) -> Self {
        OutboundMailer {
            inner: provider,
            jinja,
            settings,
            db,
            logo_path: Arc::new(logo_path.to_string()),
        }
    }

    pub async fn send_email_confirmation(
        &self,
        username: &str,
        ip: Option<&str>,
        to: &str,
        code: &str,
    ) -> Result<()> {
        let (title, contact_email, location_url) = {
            let settings = self.settings.read().await;
            (
                settings.title.clone(),
                settings.contact_email.clone(),
                settings.location_url.clone(),
            )
        };

        let context = context! {
            title,
            contact_email,
            username,
            ip,
            email => to,
            verify_url => format!("{}/account/verify?code={}", location_url, code),
            logo => format!("{}/{}", location_url, self.logo_path),
        };

        let plaintext = self
            .jinja
            .get_template("emails/verify.txt")
            .unwrap()
            .render(&context)
            .unwrap();

        let html = self
            .jinja
            .get_template("emails/verify.html")
            .unwrap()
            .render(&context)
            .unwrap();

        self.inner
            .send_email(
                to,
                &format!("{title} Email Verification"),
                &plaintext,
                &html,
                None,
                &[],
            )
            .await?;

        Ok(())
    }

    pub async fn send_email_signin(&self, ip: Option<&str>, to: &str, code: &str) -> Result<()> {
        let (title, contact_email, location_url) = {
            let settings = self.settings.read().await;
            (
                settings.title.clone(),
                settings.contact_email.clone(),
                settings.location_url.clone(),
            )
        };

        let context = context! {
            title,
            contact_email,
            ip,
            email => to,
            signin_url => format!("{}/signin/email?code={}", location_url, code),
            logo => format!("{}/{}", location_url, self.logo_path),
        };

        let plaintext = self
            .jinja
            .get_template("emails/signin.txt")
            .unwrap()
            .render(&context)
            .unwrap();

        let html = self
            .jinja
            .get_template("emails/signin.html")
            .unwrap()
            .render(&context)
            .unwrap();

        self.inner
            .send_email(
                to,
                &format!("{title} Sign In"),
                &plaintext,
                &html,
                None,
                &[],
            )
            .await?;

        Ok(())
    }

    pub async fn send_digest(&self, ticket: &Ticket, messages: &[DigestMessage<'_>]) -> Result<()> {
        let user_emails = self.db.get_emails_for_user_id(ticket.user_id).await?;
        let to = if let Some(email) = user_emails.iter().find(|e| e.verified) {
            &email.address
        } else {
            return Ok(());
        };

        // let (title, contact_email) = {
        //     let settings = self.settings.read().await;
        //     (settings.title.clone(), settings.contact_email.clone())
        // };

        let mut irc = String::new();
        for message in messages {
            let meta = format!(
                "[{}] <{}> ",
                message.timestamp.format("%Y-%m-%d %H:%M:%S"),
                message.author.name,
            );
            irc.push_str(&meta);

            let content =
                message
                    .content
                    .split('\n')
                    .skip(1)
                    .fold(String::new(), |mut output, line| {
                        let _ = write!(output, "\n{}> {}", " ".repeat(meta.len() - 2), line);
                        output
                    });
            irc.push_str(message.content.split('\n').next().unwrap());
            irc.push_str(&content);
            irc.push('\n');
        }
        let irc = irc.trim();

        let plaintext = self
            .jinja
            .get_template("emails/ticket-digest.txt")
            .unwrap()
            .render(context! {
                irc,
            })
            .unwrap();

        let messages = messages
            .iter()
            .map(|m| DigestMessage {
                author: m.author,
                edited_timestamp: m.edited_timestamp,
                timestamp: m.timestamp,
                content: markdown::to_html_with_options(
                    &m.content,
                    &markdown::Options {
                        compile: markdown::CompileOptions {
                            allow_dangerous_html: true,
                            allow_dangerous_protocol: true,
                            ..markdown::CompileOptions::default()
                        },
                        ..markdown::Options::default()
                    },
                )
                .unwrap(),
            })
            .collect::<Vec<_>>();

        let subject = format!("Ticket #{} Digest", ticket.ticket_number);

        let html = self
            .jinja
            .get_template("emails/ticket-digest.html")
            .unwrap()
            .render(context! {
                messages,
            })
            .unwrap();

        let message_id = self
            .inner
            .send_email(
                to,
                &subject,
                &plaintext,
                &html,
                ticket.email_in_reply_to.as_deref(),
                &ticket.email_references,
            )
            .await?;

        self.db
            .add_email_message_id_to_ticket(ticket.ticket_number, &message_id, false)
            .await?;

        tracing::trace!(user_id = ticket.user_id, to, "Sent digest");

        Ok(())
    }
}
