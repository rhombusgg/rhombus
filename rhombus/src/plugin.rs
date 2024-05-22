use axum::Router;
use minijinja::Environment;

use crate::{
    builder::RawDb,
    internal::{locales::Localizations, router::RouterState, settings::Settings},
    Result, UploadProvider,
};

pub struct PluginBuilder<'a, U: UploadProvider> {
    pub upload_provider: &'a U,
    pub env: &'a mut Environment<'static>,
    pub rawdb: &'a RawDb,
    pub localizations: &'a mut Localizations,
    pub settings: &'a mut Settings,
}

/// Hooks for 3rd party plugin development
#[allow(async_fn_in_trait)]
pub trait Plugin {
    async fn run<U: UploadProvider>(
        &self,
        builder: &mut PluginBuilder<'_, U>,
    ) -> Result<Router<RouterState>> {
        _ = builder;
        Ok(Router::new())
    }
}

impl Plugin for () {}

impl<P: Plugin> Plugin for (P,) {
    async fn run<U: UploadProvider>(
        &self,
        builder: &mut PluginBuilder<'_, U>,
    ) -> Result<Router<RouterState>> {
        self.0.run(builder).await
    }
}

impl<P, P2> Plugin for (P, P2)
where
    P: Plugin,
    P2: Plugin,
{
    async fn run<U: UploadProvider>(
        &self,
        builder: &mut PluginBuilder<'_, U>,
    ) -> Result<Router<RouterState>> {
        let mut router = self.1.run(builder).await?;
        router = router.merge(self.0.run(builder).await?);
        Ok(router)
    }
}
