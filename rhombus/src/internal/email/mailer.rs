use std::sync::Arc;

use crate::{
    internal::{email::provider::EmailProvider, settings::Settings},
    Result,
};
use minijinja::{context, Environment};
use tokio::sync::RwLock;

pub struct Mailer {
    pub inner: Arc<dyn EmailProvider + Send + Sync>,
    pub jinja: Arc<Environment<'static>>,
    settings: Arc<RwLock<Settings>>,
}

impl Mailer {
    pub fn new(
        provider: impl EmailProvider + Send + Sync + 'static,
        jinja: Arc<Environment<'static>>,
        settings: Arc<RwLock<Settings>>,
    ) -> Self {
        Mailer {
            inner: Arc::new(provider),
            jinja,
            settings,
        }
    }

    pub async fn send_email_confirmation(
        &self,
        username: &str,
        ip: Option<&str>,
        to: &str,
        code: &str,
    ) -> Result<()> {
        let (title, contact_email) = {
            let settings = self.settings.read().await;
            (settings.title.clone(), settings.contact_email.clone())
        };

        let context = context! {
            title,
            contact_email,
            username,
            ip,
            email => to,
            verify_url => format!("{}/account/verify?code={}", self.settings.read().await.location_url, code),
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
                plaintext,
                html,
            )
            .await
    }
}
