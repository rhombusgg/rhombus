pub use anyhow::Result;
use async_trait::async_trait;
use axum::Router;
use minijinja::Environment;

use crate::{
    backend_libsql::LibSQL, backend_postgres::Postgres, database::Connection, locales::BundleMap,
    RhombusRouterState,
};

#[async_trait]
pub trait Plugin {
    fn name(&self) -> String;

    fn routes(&self, state: RhombusRouterState) -> Router {
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

    async fn migrate_postgresql(&self, db: Postgres) -> Result<()> {
        _ = db;
        Ok(())
    }

    async fn migrate_libsql(&self, db: LibSQL) -> Result<()> {
        _ = db;
        Ok(())
    }

    async fn database(&self) -> Result<Option<Connection>> {
        Ok(None)
    }
}
