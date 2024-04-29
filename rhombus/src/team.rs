use axum::{extract::State, http::Uri, response::Html, Extension};
use minijinja::context;
use rand::{
    distributions::{Alphanumeric, DistString},
    thread_rng,
};

use crate::{auth::User, locales::Lang, RouterState};

pub fn create_team_invite_token() -> String {
    Alphanumeric.sample_string(&mut thread_rng(), 16)
}

pub async fn route_team(
    State(state): State<RouterState>,
    Extension(user): Extension<User>,
    Extension(lang): Extension<Lang>,
    uri: Uri,
) -> Html<String> {
    let team = state.db.get_team_from_id(user.id).await.unwrap();

    Html(
        state
            .jinja
            .get_template("team.html")
            .unwrap()
            .render(context! {
                lang => lang,
                user => user,
                team => team,
                uri => uri.to_string(),
                location_url => state.settings.location_url,
                og_image => format!("{}/og-image.png", state.settings.location_url),
            })
            .unwrap(),
    )
}
