use std::future::{self, Future};

use axum::{async_trait, Router};
use sqlx::PgPool;

use crate::RhombusRouterState;

#[async_trait]
pub trait Plugin {
    fn routes(&self, state: RhombusRouterState) -> Router {
        Router::new().with_state(state)
    }

    async fn migrate(&self, db: PgPool) {
        _ = db;
    }
}
