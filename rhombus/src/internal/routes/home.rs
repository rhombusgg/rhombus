use std::sync::Arc;

use axum::{
    extract::State,
    http::Uri,
    response::{Html, IntoResponse},
    Extension,
};
use minijinja::context;
use tokio::sync::Mutex;

use crate::{
    internal::{auth::MaybeUser, locales::Languages, router::RouterState},
    Plugin, UploadProvider,
};

async fn build_swapper<
    P: Plugin + Send + Sync + 'static,
    U: UploadProvider + Send + Sync + 'static,
>(
    builder: crate::Builder<P, U>,
    rr: Arc<crate::internal::router::Router>,
) {
    let router = builder.build_axum_router(rr.clone()).await.unwrap();
    rr.update(router);
}

pub async fn route_home<
    P: Plugin + Send + Sync + 'static,
    U: UploadProvider + Send + Sync + 'static,
>(
    state: State<RouterState>,
    Extension(user): Extension<MaybeUser>,
    Extension(lang): Extension<Languages>,
    Extension(builder): Extension<Arc<Mutex<Option<crate::Builder<P, U>>>>>,
    uri: Uri,
) -> impl IntoResponse {
    if let Some(builder) = builder.lock().await.take() {
        let builder = builder.config_override("auth", vec!["discord"]);
        // tracing::info!(num_plugins = builder.num_plugins);
        // let builder = builder.plugin(());
        // tracing::info!(num_plugins = builder.num_plugins);
        // let router = builder.build().await.unwrap();
        // state.router.update(router);

        let rt = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap();

        let rr = state.router.clone();

        std::thread::spawn(move || {
            let local = tokio::task::LocalSet::new();

            local.spawn_local(async move {
                tokio::task::spawn_local(build_swapper(builder, rr));
            });

            rt.block_on(local);
        });
    }

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
