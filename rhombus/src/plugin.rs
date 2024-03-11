use axum::{async_trait, Router};
use minijinja::Environment;
use sqlx::PgPool;

use crate::RhombusRouterState;

#[async_trait]
pub trait Plugin {
    fn routes(&self, state: RhombusRouterState) -> Router {
        Router::new().with_state(state)
    }

    fn theme(&self, jinja: &mut Environment<'static>) {
        _ = jinja;
    }

    async fn migrate(&self, db: PgPool) {
        _ = db;
    }
}
