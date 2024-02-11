use axum::Router;

use crate::RhombusRouterState;

pub trait Plugin {
    fn routes(&self, state: RhombusRouterState) -> Router {
        Router::new().with_state(state)
    }

    fn migrate(&self) {}
}
