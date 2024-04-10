use axum::{extract::State, http::Uri, response::Html, Extension};
use minijinja::context;
use rand::{
    distributions::{Alphanumeric, DistString},
    thread_rng,
};

use crate::{auth::ClientUser, locales::Lang, RhombusRouterState};

pub fn create_team_invite_token() -> String {
    Alphanumeric.sample_string(&mut thread_rng(), 16)
}

pub async fn route_team(
    State(state): State<RhombusRouterState>,
    Extension(user): Extension<ClientUser>,
    Extension(lang): Extension<Lang>,
    uri: Uri,
) -> Html<String> {
    Html(
        state
            .jinja
            .get_template("team.html")
            .unwrap()
            .render(context! {
                lang => lang,
                user => user,
                team_name => "thanos",
                uri => uri.to_string(),
                location_url => state.config.location_url,
                og_image => format!("{}/og-image.png", state.config.location_url),
            })
            .unwrap(),
    )
}
