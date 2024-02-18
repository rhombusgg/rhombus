use axum::{async_trait, Router};
use sqlx::PgPool;
use tera::Tera;

use crate::RhombusRouterState;

#[async_trait]
pub trait Plugin {
    fn routes(&self, state: RhombusRouterState) -> Router {
        Router::new().with_state(state)
    }

    fn theme(&self, tera: &Tera) -> Tera {
        tera.clone()
    }

    async fn migrate(&self, db: PgPool) {
        _ = db;
    }
}
