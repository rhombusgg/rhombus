use axum::{extract::State, http::Uri, response::Html, Extension};
use minijinja::context;
use rand::{
    distributions::{Alphanumeric, DistString},
    thread_rng,
};

use crate::{
    auth::{get_team_from_user_id, User},
    locales::Lang,
    RouterState,
};

pub fn create_team_invite_token() -> String {
    Alphanumeric.sample_string(&mut thread_rng(), 16)
}

pub async fn route_team(
    State(state): State<RouterState>,
    Extension(user): Extension<User>,
    Extension(lang): Extension<Lang>,
    uri: Uri,
) -> Html<String> {
    let team = get_team_from_user_id(state.db.clone(), user.id)
        .await
        .unwrap();
    Html(
        state
            .jinja
            .get_template("team.html")
            .unwrap()
            .render(context! {
                lang => lang,
                user => user,
                team_name => team.name,
                uri => uri.to_string(),
                location_url => state.settings.location_url,
                og_image => format!("{}/og-image.png", state.settings.location_url),
            })
            .unwrap(),
    )
}
