use axum::{
    extract::State,
    response::{Html, IntoResponse},
};
use serde::Serialize;
use sqlx::{prelude::FromRow, PgPool};
use tera::Context;

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

    let rendered = state
        .tera
        .render("challenges.html", &Context::from_serialize(model).unwrap())
        .unwrap();

    Html(rendered)
}
