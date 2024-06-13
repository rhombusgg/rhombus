use crate::{
    internal::{email::provider::EmailProvider, settings::Settings},
    Result,
};
use minijinja::{context, Environment};
use tokio::sync::RwLock;

pub struct Mailer {
    pub inner: &'static (dyn EmailProvider + Send + Sync),
    pub jinja: &'static Environment<'static>,
    settings: &'static RwLock<Settings>,
}

impl Mailer {
    pub fn new(
        provider: &'static (dyn EmailProvider + Send + Sync),
        jinja: &'static Environment<'static>,
        settings: &'static RwLock<Settings>,
    ) -> Self {
        Mailer {
            inner: provider,
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
                plaintext,
                html,
            )
            .await
    }
}
