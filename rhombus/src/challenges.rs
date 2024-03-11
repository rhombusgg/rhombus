use axum::{
    extract::State,
    response::{Html, IntoResponse},
};
use minijinja::context;
use serde::Serialize;
use sqlx::{prelude::FromRow, PgPool};

use crate::RhombusRouterState;

#[derive(Serialize)]
pub struct ChallengeModel {
    pub challenges: Vec<Challenge>,
}

impl ChallengeModel {
    pub async fn new(db: PgPool) -> Self {
        let challenges = sqlx::query_as::<_, Challenge>("SELECT * FROM challenge")
            .fetch_all(&db)
            .await
            .unwrap();

        Self { challenges }
    }
}

#[derive(FromRow, Debug, Serialize)]
pub struct Challenge {
    pub id: i64,
    pub name: String,
    pub description: String,
}

pub async fn route_challenges(state: State<RhombusRouterState>) -> impl IntoResponse {
    let model = ChallengeModel::new(state.db.clone()).await;

    Html(
        state
            .jinja
            .get_template("challenges.html")
            .unwrap()
            .render(context! {
                challenges => model.challenges,
            })
            .unwrap(),
    )
}
