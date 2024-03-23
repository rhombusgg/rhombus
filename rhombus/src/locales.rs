use std::collections::HashMap;

use axum::{
    body::Body,
    http::{header::ACCEPT_LANGUAGE, Request},
    middleware::Next,
    response::IntoResponse,
};
use fluent_templates::{loader::langid, LanguageIdentifier};
use minijinja::{value::Kwargs, State};
use tracing::info;

fluent_templates::static_loader! {
    static LOCALES = {
        locales: "./locales",
        fallback_language: "en-US",
    };
}

const US_ENGLISH: LanguageIdentifier = langid!("en-US");

pub fn translate(msg_id: &str, kwargs: Kwargs, state: &State) -> String {
    let langs = state
        .lookup("lang")
        .unwrap()
        .as_seq()
        .unwrap()
        .iter()
        .map(|v| v.as_str().unwrap().to_owned())
        .collect::<Vec<String>>();

    let mut args = HashMap::new();
    for key in kwargs.args() {
        let val: &str = kwargs.get(key).unwrap();
        args.insert(key, val.into());
    }
    kwargs.assert_all_used().unwrap();

    info!("---");
    for lang in langs.into_iter() {
        info!("trying lang {}", lang);
        let lang = lang.parse::<LanguageIdentifier>().unwrap();

        let message = LOCALES.lookup_no_default_fallback(&lang, msg_id, Some(&args));
        if let Some(message) = message {
            return message;
        }
    }

    let message = LOCALES.lookup_single_language(&US_ENGLISH, msg_id, Some(&args));
    if let Some(message) = message {
        message
    } else {
        format!("Translation not found for {}", msg_id)
    }
}

pub type Lang = Option<Vec<String>>;

pub async fn locale(mut req: Request<Body>, next: Next) -> impl IntoResponse {
    let lang = req
        .headers()
        .get(&ACCEPT_LANGUAGE)
        .map(|header| parse_languages(header.to_str().unwrap()));
    // .and_then(|v| v.into_iter().next());

    req.extensions_mut().insert(lang);
    next.run(req).await
}

fn parse_languages(raw_languages: &str) -> Vec<String> {
    let stripped_languages = raw_languages.to_owned().replace(' ', "");
    let language_strings: Vec<&str> = stripped_languages.split(',').collect();
    let languages: Vec<String> = language_strings
        .iter()
        .map(|l| {
            let tag_parts: Vec<&str> = l.split(';').collect();
            let name = tag_parts[0].to_string();
            name
        })
        .filter(|l| !l.is_empty())
        .collect();
    languages
}
