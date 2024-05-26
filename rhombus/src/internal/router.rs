use std::sync::Arc;

use tokio::sync::RwLock;

use crate::internal::{
    database::provider::Connection, discord::Bot, email::mailer::Mailer, ip::IpExtractorFn,
    locales::Localizations, settings::Settings,
};

pub type RouterState = Arc<RouterStateInner>;

pub struct RouterStateInner {
    pub db: Connection,
    pub bot: Bot,
    pub jinja: Arc<minijinja::Environment<'static>>,
    pub localizer: Arc<Localizations>,
    pub settings: Arc<RwLock<Settings>>,
    pub ip_extractor: IpExtractorFn,
    pub mailer: Option<Arc<Mailer>>,
}
