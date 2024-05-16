use axum::{
    extract::State,
    http::Uri,
    response::{Html, IntoResponse},
    Extension,
};
use minijinja::context;

use super::{auth::MaybeUser, locales::Languages, router::RouterState};

pub async fn route_home(
    state: State<RouterState>,
    Extension(user): Extension<MaybeUser>,
    Extension(lang): Extension<Languages>,
    uri: Uri,
) -> impl IntoResponse {
    let location_url = { state.settings.read().await.location_url.clone() };
    Html(
        state
            .jinja
            .get_template("home.html")
            .unwrap()
            .render(context! {
                lang => lang,
                user => user,
                uri => uri.to_string(),
                location_url => location_url,
                og_image => format!("{}/og-image.png", location_url)
            })
            .unwrap(),
    )
}
