use std::sync::Arc;

use super::{database::Connection, ip::IpExtractorFn, settings::Settings};

pub type RouterState = Arc<RouterStateInner>;

pub struct RouterStateInner {
    pub db: Connection,
    pub jinja: minijinja::Environment<'static>,
    pub settings: Arc<Settings>,
    pub ip_extractor: IpExtractorFn,
}
