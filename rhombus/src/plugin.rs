use async_trait::async_trait;
use axum::Router;
use minijinja::Environment;

use crate::Result;

/// Hooks for 3rd party plugin development
#[async_trait]
pub trait Plugin {
    fn name(&self) -> String;

    fn routes(&self, state: crate::internal::router::RouterState) -> Router {
        Router::new().with_state(state)
    }

    fn theme(&self, jinja: &mut Environment<'static>) -> Result<()> {
        _ = jinja;
        Ok(())
    }

    fn localize(&self, bundlemap: &mut crate::internal::locales::BundleMap) -> Result<()> {
        _ = bundlemap;
        Ok(())
    }

    #[cfg(feature = "postgres")]
    async fn migrate_postgresql(
        &self,
        db: crate::internal::backend_postgres::Postgres,
    ) -> Result<()> {
        _ = db;
        Ok(())
    }

    #[cfg(feature = "libsql")]
    async fn migrate_libsql(&self, db: crate::internal::backend_libsql::LibSQL) -> Result<()> {
        _ = db;
        Ok(())
    }

    async fn database(&self) -> Result<Option<crate::internal::database::Connection>> {
        Ok(None)
    }
}
