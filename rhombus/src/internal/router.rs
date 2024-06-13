use tokio::sync::RwLock;

use crate::internal::{
    database::provider::Connection, discord::Bot, division::Division, email::mailer::Mailer,
    ip::IpExtractorFn, locales::Localizations, settings::Settings,
};

pub type RouterState = &'static RouterStateInner;

pub struct RouterStateInner {
    pub db: Connection,
    pub bot: Bot,
    pub jinja: &'static minijinja::Environment<'static>,
    pub localizer: &'static Localizations,
    pub settings: &'static RwLock<Settings>,
    pub ip_extractor: IpExtractorFn,
    pub mailer: Option<Mailer>,
    pub divisions: &'static Vec<Division>,
}
