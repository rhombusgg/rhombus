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
    let challenges = state.db.get_challenges();
    let team = state.db.get_team_from_id(user.team_id);
    let (challenges, team) = tokio::join!(challenges, team);
    let challenges = challenges.unwrap();
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
                challenges => challenges,
                team => team,
            })
            .unwrap(),
    )
}
