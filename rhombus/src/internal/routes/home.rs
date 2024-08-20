use axum::{
    extract::State,
    http::Uri,
    response::{Html, IntoResponse},
    Extension,
};
use minijinja::context;

use crate::internal::{auth::MaybeUser, locales::Languages, router::RouterState};

pub async fn route_home(
    state: State<RouterState>,
    Extension(user): Extension<MaybeUser>,
    Extension(lang): Extension<Languages>,
    uri: Uri,
) -> impl IntoResponse {
    let (location_url, title, home) = {
        let settings = state.settings.read().await;
        (
            settings.location_url.clone(),
            settings.title.clone(),
            settings.home.clone(),
        )
    };

    let content = home.and_then(|home| {
        home.content.map(|content| {
            markdown::to_html_with_options(
                &content,
                &markdown::Options {
                    compile: markdown::CompileOptions {
                        allow_dangerous_html: true,
                        allow_dangerous_protocol: true,
                        ..markdown::CompileOptions::default()
                    },
                    ..markdown::Options::default()
                },
            )
            .unwrap()
        })
    });

    Html(
        state
            .jinja
            .get_template("home.html")
            .unwrap()
            .render(context! {
                title,
                lang,
                user,
                location_url,
                content,
                uri => uri.to_string(),
                og_image => format!("{}/og-image.png", location_url)
            })
            .unwrap(),
    )
}
