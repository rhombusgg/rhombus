use std::{any::Any, sync::Arc};

use axum::Router;
use tokio::sync::RwLock;

use crate::{
    builder::RawDb,
    internal::{
        database::provider::Connection, division::Division, locales::Localizations,
        router::RouterState, settings::Settings, templates::Templates,
    },
    upload_provider::EitherUploadProvider,
    Result, UploadProvider,
};

pub struct RunContext<'a, U: UploadProvider> {
    /// The selected upload provider which can be used to upload files with.
    /// For a plugin to provide a custom upload provider, implement the [upload_provider](Plugin::upload_provider)
    /// function of the [Plugin] trait.
    pub upload_provider: &'a U,

    pub templates: &'a mut Templates,

    /// [Fluent](https://projectfluent.org) localizations to add or modify language strings.
    pub localizations: &'a mut Localizations,

    /// Raw database connection for the chosen database which can be used to execute raw queries
    pub rawdb: &'a RawDb,

    /// Base settings for the application.
    ///
    /// Make sure to clearly communicate changes to the user if their settings are modified
    /// to prevent confusion.
    pub settings: Arc<RwLock<Settings>>,

    /// High level database connection used by Rhombus core.
    pub db: Connection,

    /// Divisions and their eligibility functions.
    pub divisions: &'a mut Vec<Division>,
}

pub struct UploadProviderContext<'a> {
    /// Base settings for the application.
    pub settings: &'a Settings,

    /// High level database connection used by Rhombus core.
    pub db: Connection,
}

pub struct DatabaseProviderContext<'a> {
    /// Base settings for the application.
    pub settings: &'a mut Settings,
}

/// A plugin can be used to extend Rhombus with custom functionality, themes, or localization.
///
/// ## Order of execution
///
/// First, review and understand the [Builder Order of Execution](crate::builder::Builder#order-of-execution).
///
/// 1. The [upload_provider](Plugin::upload_provider) function is called for each plugin in reverse
///    order of plugins defined until the first plugin is found which implements a custom upload provider, which is then used.
///    If no plugin implements a custom upload provider, the default upload provider creation process will happen.
/// 2. The [run](Plugin::run) function is called for each plugin in the order they are defined.
#[allow(async_fn_in_trait)]
pub trait Plugin {
    /// Supply a custom [UploadProvider].
    ///
    /// ```
    /// # use rhombus::{Plugin, LocalUploadProvider, UploadProvider, plugin::UploadProviderContext};
    /// struct MyUploadProviderPlugin;
    ///
    /// /// Simple local upload provider wrapper
    /// impl Plugin for MyUploadProviderPlugin {
    ///     async fn upload_provider(
    ///         &self,
    ///         context: &UploadProviderContext<'_>,
    ///     ) -> Option<impl UploadProvider + Send + Sync> {
    ///          let local = LocalUploadProvider::new("myplugin-uploads".into());
    ///          Some(local)
    ///     }
    /// }
    /// ```
    async fn upload_provider(
        &self,
        context: &UploadProviderContext<'_>,
    ) -> Option<impl UploadProvider + Send + Sync> {
        _ = context;
        None::<()>
    }

    async fn database_provider(
        &self,
        _context: &mut DatabaseProviderContext<'_>,
    ) -> Option<(Connection, Box<dyn Any + Send + Sync>)> {
        None
    }

    async fn run<U: UploadProvider>(
        &self,
        context: &mut RunContext<'_, U>,
    ) -> Result<Router<RouterState>> {
        _ = context;
        Ok(Router::new())
    }
}

/// Empty plugin implementation for internal heterogeneous plugin tuples.
impl Plugin for () {}

/// Plugin implementation for internal single plugin heterogenous plugin tuple.
impl<P: Plugin> Plugin for (P,) {
    async fn upload_provider(
        &self,
        context: &UploadProviderContext<'_>,
    ) -> Option<impl UploadProvider + Send + Sync> {
        self.0.upload_provider(context).await
    }

    async fn database_provider(
        &self,
        context: &mut DatabaseProviderContext<'_>,
    ) -> Option<(Connection, Box<dyn Any + Send + Sync>)> {
        self.0.database_provider(context).await
    }

    async fn run<U: UploadProvider>(
        &self,
        context: &mut RunContext<'_, U>,
    ) -> Result<Router<RouterState>> {
        self.0.run(context).await
    }
}

/// Plugin implementation for internal two plugin tuple heterogenous plugin tuple.
impl<P, P2> Plugin for (P, P2)
where
    P: Plugin,
    P2: Plugin,
{
    async fn upload_provider(
        &self,
        context: &UploadProviderContext<'_>,
    ) -> Option<impl UploadProvider + Send + Sync> {
        match self.0.upload_provider(context).await {
            Some(u) => Some(EitherUploadProvider::Left(u)),
            None => self
                .1
                .upload_provider(context)
                .await
                .map(EitherUploadProvider::Right),
        }
    }

    async fn database_provider(
        &self,
        context: &mut DatabaseProviderContext<'_>,
    ) -> Option<(Connection, Box<dyn Any + Send + Sync>)> {
        match self.0.database_provider(context).await {
            Some(u) => Some(u),
            None => self.1.database_provider(context).await,
        }
    }

    async fn run<U: UploadProvider>(
        &self,
        context: &mut RunContext<'_, U>,
    ) -> Result<Router<RouterState>> {
        let mut router = self.1.run(context).await?;
        router = router.merge(self.0.run(context).await?);
        Ok(router)
    }
}
