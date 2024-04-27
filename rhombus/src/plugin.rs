use async_trait::async_trait;
use axum::Router;
use minijinja::Environment;

use crate::{database::Connection, locales::BundleMap, Result, RouterState};

#[async_trait]
pub trait Plugin {
    fn name(&self) -> String;

    fn routes(&self, state: RouterState) -> Router {
        Router::new().with_state(state)
    }

    fn theme(&self, jinja: &mut Environment<'static>) -> Result<()> {
        _ = jinja;
        Ok(())
    }

    fn localize(&self, bundlemap: &mut BundleMap) -> Result<()> {
        _ = bundlemap;
        Ok(())
    }

    #[cfg(feature = "postgres")]
    async fn migrate_postgresql(&self, db: crate::backend_postgres::Postgres) -> Result<()> {
        _ = db;
        Ok(())
    }

    #[cfg(feature = "libsql")]
    async fn migrate_libsql(&self, db: crate::backend_libsql::LibSQL) -> Result<()> {
        _ = db;
        Ok(())
    }

    async fn database(&self) -> Result<Option<Connection>> {
        Ok(None)
    }
}
