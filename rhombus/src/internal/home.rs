use axum::{
    extract::State,
    http::Uri,
    response::{Html, IntoResponse},
    Extension,
};
use minijinja::context;

use super::{auth::MaybeUser, locales::Lang, router::RouterState};

pub async fn route_home(
    state: State<RouterState>,
    Extension(user): Extension<MaybeUser>,
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
