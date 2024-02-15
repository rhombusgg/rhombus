use std::future::{self, Future};

use axum::Router;
use sqlx::PgPool;

use crate::RhombusRouterState;

pub trait Plugin {
    fn routes(&self, state: RhombusRouterState) -> Router {
        Router::new().with_state(state)
    }

    fn migrate(&self, db: PgPool) -> impl Future<Output = ()> {
        _ = db;
        future::ready(())
    }
}
