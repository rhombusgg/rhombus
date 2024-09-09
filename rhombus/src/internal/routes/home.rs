use axum::{
    extract::State,
    response::{Html, IntoResponse},
    Extension,
};
use minijinja::context;

use crate::internal::{auth::MaybeUser, router::RouterState, routes::meta::PageMeta};

pub async fn route_home(
    state: State<RouterState>,
    Extension(user): Extension<MaybeUser>,
    Extension(page): Extension<PageMeta>,
) -> impl IntoResponse {
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

    Html(
        state
            .jinja
            .get_template("home.html")
            .unwrap()
            .render(context! {
                global => state.global_page_meta,
                page,
                user,
                content,
            })
            .unwrap(),
    )
}
