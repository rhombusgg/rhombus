use std::sync::Arc;

use super::{
    database::Connection, discord::Bot, ip::IpExtractorFn, locales::Localizations,
    settings::Settings,
};

pub type RouterState = Arc<RouterStateInner>;

pub struct RouterStateInner {
    pub db: Connection,
    pub bot: Bot,
    pub jinja: minijinja::Environment<'static>,
    pub localizer: Arc<Localizations>,
    pub settings: Arc<Settings>,
    pub ip_extractor: IpExtractorFn,
}
