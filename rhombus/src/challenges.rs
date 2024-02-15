use axum::{
    extract::State,
    response::{Html, IntoResponse},
};
use maud::{html, Render};
use sqlx::{prelude::FromRow, PgPool};

use crate::{page_layout, RhombusRouterState};

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

#[derive(FromRow, Debug)]
pub struct Challenge {
    pub id: i64,
    pub name: String,
    pub description: String,
}

pub async fn route_challenges(state: State<RhombusRouterState>) -> impl IntoResponse {
    let challenges = sqlx::query_as::<_, Challenge>("SELECT * FROM challenge")
        .fetch_all(&state.db)
        .await
        .unwrap();

    Html(
        page_layout(html! {
            h1 { "rhombus view" }
            ul {
                @for challenge in challenges {
                    li class="flex gap-2" {
                        div { (challenge.id) }
                        div { (challenge.name) }
                        div { (challenge.description) }
                    }
                }
            }
        })
        .render()
        .0,
    )
}
