use axum::{
    extract::State,
    http::Uri,
    response::{Html, IntoResponse},
    Extension,
};
use minijinja::context;

use crate::{auth::MaybeClientUser, locales::Lang, RouterState};

pub async fn route_home(
    State(state): State<RouterState>,
    Extension(user): Extension<MaybeClientUser>,
    Extension(lang): Extension<Lang>,
    uri: Uri,
) -> impl IntoResponse {
    Html(
        state
            .jinja
            .get_template("home.html")
            .unwrap()
            .render(context! {
                lang => lang,
                user => user,
                uri => uri.to_string(),
                location_url => state.settings.location_url,
                og_image => format!("{}/og-image.png", state.settings.location_url)
            })
            .unwrap(),
    )
}
