use axum::{
    extract::State,
    http::Extensions,
    response::{Html, IntoResponse, Response},
    Extension,
};
use minijinja::context;

use crate::internal::{
    auth::MaybeUser, errors::IntoErrorResponse, router::RouterState, routes::meta::PageMeta,
};

pub async fn route_home(
    State(state): State<RouterState>,
    Extension(user): Extension<MaybeUser>,
    Extension(page): Extension<PageMeta>,
    extensions: Extensions,
) -> std::result::Result<impl IntoResponse, Response> {
    let home = state.settings.read().await.home.clone();

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

    Ok(Html(
        state
            .jinja
            .get_template("home.html")
            .map_err_page(&extensions, "Failed to get template")?
            .render(context! {
                global => state.global_page_meta,
                page,
                user,
                content,
            })
            .map_err_page(&extensions, "Failed to render template")?,
    ))
}
