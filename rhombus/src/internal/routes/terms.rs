use axum::{
    extract::State,
    response::{Html, IntoResponse},
    Extension,
};
use minijinja::context;

use crate::internal::{auth::MaybeUser, router::RouterState, routes::meta::PageMeta};

pub async fn route_terms(
    state: State<RouterState>,
    Extension(user): Extension<MaybeUser>,
    Extension(page): Extension<PageMeta>,
) -> impl IntoResponse {
    let terms = state.settings.read().await.terms.clone();

    let content = terms.map(|terms| {
        markdown::to_html_with_options(
            &terms,
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
    });

    Html(
        state
            .jinja
            .get_template("terms.html")
            .unwrap()
            .render(context! {
                global => state.global_page_meta,
                page,
                title => format!("Terms | {}", state.global_page_meta.title),
                user,
                content,
            })
            .unwrap(),
    )
}
