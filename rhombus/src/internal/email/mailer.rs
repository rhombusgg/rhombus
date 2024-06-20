use std::fmt::Write;

use crate::{
    internal::{
        database::provider::{Connection, Ticket},
        discord::DigestMessage,
        email::provider::EmailProvider,
        settings::Settings,
    },
    Result,
};
use minijinja::{context, Environment};
use tokio::sync::RwLock;

pub struct Mailer {
    pub inner: &'static (dyn EmailProvider + Send + Sync),
    pub jinja: &'static Environment<'static>,
    pub settings: &'static RwLock<Settings>,
    pub db: Connection,
}

impl Mailer {
    pub fn new(
        provider: &'static (dyn EmailProvider + Send + Sync),
        jinja: &'static Environment<'static>,
        settings: &'static RwLock<Settings>,
        db: Connection,
    ) -> Self {
        Mailer {
            inner: provider,
            jinja,
            settings,
            db,
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
            logo => "https://avatars.githubusercontent.com/u/152339298",
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
                &format!("{} Email Verification", title),
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
            logo => "https://avatars.githubusercontent.com/u/152339298",
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
                &format!("{} Sign In", title),
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

        Ok(())
    }
}
