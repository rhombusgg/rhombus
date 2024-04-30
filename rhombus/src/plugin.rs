use axum::Router;
use minijinja::Environment;

use crate::Result;

/// Hooks for 3rd party plugin development
#[allow(async_fn_in_trait)]
pub trait Plugin {
    fn name(&self) -> String;

    fn theme(&self, jinja: &mut Environment<'static>) -> Result<()> {
        _ = jinja;
        Ok(())
    }

    #[cfg_attr(all(doc, CHANNEL_NIGHTLY), doc(cfg(feature = "internal")))]
    fn routes(&self, state: crate::internal::router::RouterState) -> Router {
        Router::new().with_state(state)
    }

    #[cfg_attr(all(doc, CHANNEL_NIGHTLY), doc(cfg(feature = "internal")))]
    fn localize(&self, bundlemap: &mut crate::internal::locales::BundleMap) -> Result<()> {
        _ = bundlemap;
        Ok(())
    }

    #[cfg(feature = "postgres")]
    #[cfg_attr(
        all(doc, CHANNEL_NIGHTLY),
        doc(cfg(feature = "postgres")),
        doc(cfg(feature = "internal"))
    )]
    async fn migrate_postgresql(
        &self,
        db: crate::internal::backend_postgres::Postgres,
    ) -> Result<()> {
        _ = db;
        Ok(())
    }

    #[cfg(feature = "libsql")]
    #[cfg_attr(
        all(doc, CHANNEL_NIGHTLY),
        doc(cfg(feature = "libsql")),
        doc(cfg(feature = "internal"))
    )]
    async fn migrate_libsql(&self, db: crate::internal::backend_libsql::LibSQL) -> Result<()> {
        _ = db;
        Ok(())
    }

    #[cfg_attr(all(doc, CHANNEL_NIGHTLY), doc(cfg(feature = "internal")))]
    async fn database(&self) -> Result<Option<crate::internal::database::Connection>> {
        Ok(None)
    }
}

impl Plugin for () {
    fn name(&self) -> String {
        "nop".to_owned()
    }
}

impl<P: Plugin> Plugin for (P,) {
    fn name(&self) -> String {
        self.0.name()
    }

    fn theme(&self, jinja: &mut Environment<'static>) -> Result<()> {
        self.0.theme(jinja)
    }

    fn routes(&self, state: crate::internal::router::RouterState) -> Router {
        self.0.routes(state)
    }

    fn localize(&self, bundlemap: &mut crate::internal::locales::BundleMap) -> Result<()> {
        self.0.localize(bundlemap)
    }

    #[cfg(feature = "postgres")]
    async fn migrate_postgresql(
        &self,
        db: crate::internal::backend_postgres::Postgres,
    ) -> Result<()> {
        self.0.migrate_postgresql(db).await
    }

    #[cfg(feature = "libsql")]
    async fn migrate_libsql(&self, db: crate::internal::backend_libsql::LibSQL) -> Result<()> {
        self.0.migrate_libsql(db).await
    }

    async fn database(&self) -> Result<Option<crate::internal::database::Connection>> {
        self.0.database().await
    }
}

impl<P, P2> Plugin for (P, P2)
where
    P: Plugin,
    P2: Plugin,
{
    fn name(&self) -> String {
        self.1.name();
        self.0.name()
    }

    fn theme(&self, jinja: &mut Environment<'static>) -> Result<()> {
        self.1.theme(jinja)?;
        self.0.theme(jinja)
    }

    fn routes(&self, state: crate::internal::router::RouterState) -> Router {
        self.1.routes(state.clone()).merge(self.0.routes(state))
    }

    fn localize(&self, bundlemap: &mut crate::internal::locales::BundleMap) -> Result<()> {
        self.1.localize(bundlemap)?;
        self.0.localize(bundlemap)
    }

    #[cfg(feature = "postgres")]
    async fn migrate_postgresql(
        &self,
        db: crate::internal::backend_postgres::Postgres,
    ) -> Result<()> {
        self.1.migrate_postgresql(db.clone()).await?;
        self.0.migrate_postgresql(db).await
    }

    #[cfg(feature = "libsql")]
    async fn migrate_libsql(&self, db: crate::internal::backend_libsql::LibSQL) -> Result<()> {
        self.1.migrate_libsql(db.clone()).await?;
        self.0.migrate_libsql(db).await
    }

    async fn database(&self) -> Result<Option<crate::internal::database::Connection>> {
        if let Some(db) = self.1.database().await? {
            Ok(Some(db))
        } else {
            self.0.database().await
        }
    }
}
