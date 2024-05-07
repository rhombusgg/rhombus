use axum::{
    extract::State,
    http::Uri,
    response::{Html, IntoResponse},
    Extension,
};
use minijinja::context;

use super::{auth::User, locales::Languages, router::RouterState};

pub async fn route_challenges(
    state: State<RouterState>,
    Extension(user): Extension<User>,
    Extension(lang): Extension<Languages>,
    uri: Uri,
) -> impl IntoResponse {
    let challenge_data = state.db.get_challenges();
    let team = state.db.get_team_from_id(user.team_id);
    let (challenge_data, team) = tokio::join!(challenge_data, team);
    let challenge_data = challenge_data.unwrap();
    let team = team.unwrap();

    Html(
        state
            .jinja
            .get_template("challenges.html")
            .unwrap()
            .render(context! {
                lang => lang,
                user => user,
                uri => uri.to_string(),
                challenges => challenge_data.challenges,
                categories => challenge_data.categories,
                authors => challenge_data.authors,
                team => team,
            })
            .unwrap(),
    )
}
