use std::{any::Any, borrow::Cow, collections::BTreeMap, convert::Infallible, sync::Arc};

use axum::Router;
use prost_types::FileDescriptorSet;
use tokio::sync::{Mutex, RwLock};
use tonic::{body::BoxBody, service::RoutesBuilder};

use crate::{
    builder::RawDb,
    internal::{
        database::provider::Connection,
        division::Division,
        locales::Localizations,
        router::RouterState,
        routes::challenges::{ChallengeFlag, ChallengePoints},
        settings::Settings,
        templates::Templates,
    },
    upload_provider::ErasedUploadProvider,
    Result,
};

pub struct RunContext<'a> {
    /// The selected upload provider which can be used to upload files with.
    /// For a plugin to provide a custom upload provider, implement the [upload_provider](Plugin::upload_provider)
    /// function of the [Plugin] trait.
    pub upload_provider: Box<dyn ErasedUploadProvider>,

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

    pub score_type_map: &'a Arc<Mutex<BTreeMap<String, Box<dyn ChallengePoints + Send + Sync>>>>,

    pub flag_fn_map: &'a Arc<Mutex<BTreeMap<String, Box<dyn ChallengeFlag + Send + Sync>>>>,

    pub grpc_builder: &'a mut GrpcBuilder,
}

pub struct GrpcBuilder {
    pub(crate) routes: RoutesBuilder,
    pub(crate) file_descriptor_sets: Vec<FileDescriptorSet>,
    pub(crate) encoded_file_descriptor_sets: Vec<&'static [u8]>,
}

impl GrpcBuilder {
    pub fn add_service<S>(&mut self, svc: S) -> &mut Self
    where
        S: tower::Service<
                axum::http::Request<BoxBody>,
                Response = axum::http::Response<BoxBody>,
                Error = Infallible,
            > + tonic::server::NamedService
            + Clone
            + Send
            + 'static,
        S::Future: Send + 'static,
        S::Error: Into<Box<dyn std::error::Error + Send + Sync>> + Send,
    {
        self.routes.add_service(svc);
        self
    }

    /// Registers an instance of `prost_types::FileDescriptorSet` with the gRPC Reflection
    /// Service builder.
    pub fn register_file_descriptor_set(
        &mut self,
        file_descriptor_set: FileDescriptorSet,
    ) -> &mut Self {
        self.file_descriptor_sets.push(file_descriptor_set);
        self
    }

    /// Registers a byte slice containing an encoded `prost_types::FileDescriptorSet` with
    /// the gRPC Reflection Service builder.
    pub fn register_encoded_file_descriptor_set(
        &mut self,
        encoded_file_descriptor_set: &'static [u8],
    ) -> &mut Self {
        self.encoded_file_descriptor_sets
            .push(encoded_file_descriptor_set);
        self
    }
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

pub struct PluginMeta {
    pub name: Cow<'static, str>,
    pub version: Cow<'static, str>,
    pub description: Cow<'static, str>,
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
#[async_trait::async_trait]
pub trait Plugin {
    fn meta(&self) -> PluginMeta;

    /// Supply a custom [crate::upload_provider::UploadProvider].
    ///
    /// ```
    /// # use rhombus::{Plugin, LocalUploadProvider, upload_provider::ErasedUploadProvider, plugin::{UploadProviderContext, PluginMeta}};
    /// # use async_trait::async_trait;
    /// struct MyUploadProviderPlugin;
    ///
    /// /// Simple local upload provider wrapper
    /// #[async_trait]
    /// impl Plugin for MyUploadProviderPlugin {
    ///     # fn meta(&self) -> PluginMeta { todo!() }
    ///     async fn upload_provider(
    ///         &self,
    ///         context: &UploadProviderContext<'_>,
    ///     ) -> Option<Box<dyn ErasedUploadProvider>> {
    ///          let local = LocalUploadProvider::new("myplugin-uploads".into());
    ///          Some(Box::new(local))
    ///     }
    /// }
    /// ```
    async fn upload_provider(
        &self,
        context: &UploadProviderContext<'_>,
    ) -> Option<Box<dyn ErasedUploadProvider>> {
        _ = context;
        None
    }

    async fn database_provider(
        &self,
        _context: &mut DatabaseProviderContext<'_>,
    ) -> Option<(Connection, Box<dyn Any + Send + Sync>)> {
        None
    }

    async fn run(&self, context: &mut RunContext<'_>) -> Result<Router<RouterState>> {
        _ = context;
        Ok(Router::new())
    }
}
