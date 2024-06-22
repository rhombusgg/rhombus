use tokio::sync::RwLock;

use crate::internal::{
    database::provider::Connection, discord::Bot, division::Division,
    email::outbound_mailer::OutboundMailer, ip::IpExtractorFn, locales::Localizations,
    settings::Settings,
};

pub type RouterState = &'static RouterStateInner;

pub struct RouterStateInner {
    pub db: Connection,
    pub bot: &'static Bot,
    pub jinja: &'static minijinja::Environment<'static>,
    pub localizer: &'static Localizations,
    pub settings: &'static RwLock<Settings>,
    pub ip_extractor: IpExtractorFn,
    pub outbound_mailer: Option<&'static OutboundMailer>,
    pub divisions: &'static Vec<Division>,
}
