use axum::{
    body::Body,
    http::{header::ACCEPT_LANGUAGE, Request},
    middleware::Next,
    response::IntoResponse,
};
use chrono::DateTime;
use fluent::{bundle::FluentBundle, FluentArgs, FluentResource, FluentValue};
use intl_memoizer::concurrent::IntlLangMemoizer;
use minijinja::{value::Kwargs, State, Value};
use rust_embed::RustEmbed;
use std::collections::{BTreeMap, HashMap};
use unic_langid::{langid, LanguageIdentifier};

use super::router::RouterState;

pub type BundleMap = HashMap<String, FluentBundle<FluentResource, IntlLangMemoizer>>;

pub struct Localizations {
    pub bundles: BundleMap,
    pub available_languages: Vec<LanguageIdentifier>,
}

const ENGLISH: LanguageIdentifier = langid!("en");

#[derive(RustEmbed)]
#[folder = "locales"]
struct Locales;

impl Localizations {
    pub fn new() -> Self {
        let mut bundles = HashMap::new();
        let mut available_languages = vec![];

        for file in Locales::iter() {
            let bytes = Locales::get(&file).unwrap();
            let source = std::str::from_utf8(bytes.data.as_ref()).unwrap();

            let (lang, _) = file.split_once('/').unwrap();
            let lang_id = lang.parse::<LanguageIdentifier>().unwrap();

            let resource = FluentResource::try_new(source.to_owned()).unwrap();
            let li = lang_id.clone();
            let bundle = bundles
                .entry(lang.to_owned())
                .or_insert_with(move || FluentBundle::new_concurrent(vec![li]));
            bundle.add_resource_overriding(resource);
            available_languages.push(lang_id);
        }

        Localizations {
            bundles,
            available_languages,
        }
    }

    pub fn negotiate_languages(&self, requested: Vec<LanguageIdentifier>) -> Vec<String> {
        let default = ENGLISH;
        let languages = negotiate_languages(&requested, &self.available_languages, Some(&default));
        languages.into_iter().map(|l| l.to_string()).collect()
    }

    pub fn localize(
        &self,
        languages: &Vec<String>,
        msg_id: &str,
        args: Option<&HashMap<&str, FluentValue>>,
    ) -> Option<String> {
        for lang in languages {
            let bundle = self.bundles.get(lang)?;
            let pattern = || -> Option<_> {
                if let Some((msg, attr)) = msg_id.split_once('.') {
                    Some(
                        bundle
                            .get_message(msg)?
                            .attributes()
                            .find(|attribute| attribute.id() == attr)?
                            .value(),
                    )
                } else {
                    Some(bundle.get_message(msg_id)?.value()?)
                }
            }();

            if pattern.is_none() {
                continue;
            }
            let pattern = pattern.unwrap();

            let mut errors = Vec::new();
            let args = args.map(map_to_fluent_args);
            let value = bundle.format_pattern(pattern, args.as_ref(), &mut errors);

            if errors.is_empty() {
                return Some(value.into());
            } else {
                panic!("Failed to format a message for locale {lang} and id {msg_id}.\nErrors\n{errors:?}")
            }
        }

        None
    }
}

impl Default for Localizations {
    fn default() -> Self {
        Localizations::new()
    }
}

pub fn jinja_translate(
    localizer: &'static Localizations,
    msg_id: &str,
    kwargs: Kwargs,
    state: &State,
) -> String {
    let langs = state.lookup("lang");
    if langs.is_none() {
        tracing::error!(msg_id, "Must specify `lang` in template");
        return "Must specify `lang` in template".to_owned();
    }

    let langs = langs.unwrap();
    let langs = langs
        .as_object()
        .unwrap()
        .try_iter()
        .unwrap()
        .map(|v| v.to_string())
        .collect::<Vec<String>>();

    let mut args = HashMap::new();
    for key in kwargs.args() {
        let maybe_str = kwargs.get::<&str>(key).map(FluentValue::from);
        let maybe_number = kwargs.get::<i64>(key).map(FluentValue::from);
        args.insert(key, maybe_str.or(maybe_number).unwrap_or(FluentValue::None));
    }
    kwargs.assert_all_used().unwrap();

    let text = localizer.localize(&langs, msg_id, Some(&args));

    text.unwrap_or(format!("Translation not found for {}", msg_id))
}

pub fn jinja_timediff(time1: &str, time2: &str) -> Value {
    let time1 = DateTime::parse_from_rfc3339(time1).unwrap();
    let time2 = DateTime::parse_from_rfc3339(time2).unwrap();

    let diff = time2 - time1;

    let seconds = diff.num_seconds() % 60;
    let minutes = (diff.num_seconds() / 60) % 60;
    let hours = (diff.num_seconds() / 60 / 60) % 24;
    let days = (diff.num_seconds() / 60 / 60 / 24) % 30;
    let months = (diff.num_seconds() / 60 / 60 / 24 / 30) % 12;
    let years = diff.num_seconds() / 60 / 60 / 24 / 30 / 12;

    Value::from({
        let mut m = BTreeMap::new();
        m.insert("seconds", seconds);
        m.insert("minutes", minutes);
        m.insert("hours", hours);
        m.insert("days", days);
        m.insert("months", months);
        m.insert("years", years);
        m
    })
}

pub type Languages = Vec<String>;

pub async fn locale_middleware(
    state: axum::extract::State<RouterState>,
    mut req: Request<Body>,
    next: Next,
) -> impl IntoResponse {
    let requested_languages = req
        .headers()
        .get(&ACCEPT_LANGUAGE)
        .map(|header| parse_languages(header.to_str().unwrap()))
        .unwrap_or(vec![ENGLISH]);

    let languages: Languages = state.localizer.negotiate_languages(requested_languages);

    req.extensions_mut().insert(languages);
    next.run(req).await
}

pub fn parse_languages(raw_languages: &str) -> Vec<LanguageIdentifier> {
    let stripped_languages = raw_languages.to_owned().replace(' ', "");
    let language_strings: Vec<&str> = stripped_languages.split(',').collect();
    language_strings
        .iter()
        .map(|l| {
            let tag_parts: Vec<&str> = l.split(';').collect();
            tag_parts[0].to_owned()
        })
        .filter(|l| !l.is_empty())
        .map(|l| l.parse::<LanguageIdentifier>())
        .filter_map(Result::ok)
        .collect()
}

pub fn filter_matches<'a, R: 'a + AsRef<LanguageIdentifier>, A: 'a + AsRef<LanguageIdentifier>>(
    requested: &[R],
    available: &'a [A],
) -> Vec<&'a A> {
    let mut supported_locales = vec![];

    let mut available_locales: Vec<&A> = available.iter().collect();

    for req in requested {
        let req = req.as_ref().to_owned();
        macro_rules! test_strategy {
            ($self_as_range:expr, $other_as_range:expr) => {{
                let mut match_found = false;
                available_locales.retain(|locale| {
                    if locale
                        .as_ref()
                        .matches(&req, $self_as_range, $other_as_range)
                    {
                        match_found = true;
                        supported_locales.push(*locale);
                        return false;
                    }
                    true
                });
            }};
        }

        // 1) Try to find a simple (case-insensitive) string match for the request.
        test_strategy!(false, false);

        // 2) Try to match against the available locales treated as ranges.
        test_strategy!(true, false);

        // Per Unicode TR35, 4.4 Locale Matching, we don't add likely subtags to
        // requested locales, so we'll skip it from the rest of the steps.
        if req.language.is_empty() {
            continue;
        }
    }

    supported_locales.sort_by(|x, y| {
        let x_specificity = into_specificity(x.as_ref());
        let y_specificity = into_specificity(y.as_ref());
        x_specificity.cmp(&y_specificity).reverse()
    });

    supported_locales
}

pub fn into_specificity(lang: &LanguageIdentifier) -> usize {
    let mut specificity = 0;

    if lang.script.is_some() {
        specificity += 1;
    }

    if lang.region.is_some() {
        specificity += 1;
    }

    specificity += lang.variants().len();

    specificity
}

pub fn negotiate_languages<
    'a,
    R: 'a + AsRef<LanguageIdentifier>,
    A: 'a + AsRef<LanguageIdentifier> + PartialEq,
>(
    requested: &[R],
    available: &'a [A],
    default: Option<&'a A>,
) -> Vec<&'a A> {
    let mut supported = filter_matches(requested, available);

    if let Some(default) = default {
        if !supported.contains(&default) {
            supported.push(default);
        }
    }
    supported
}

pub fn map_to_fluent_args<'map, T: AsRef<str>>(
    map: &'map HashMap<T, FluentValue>,
) -> FluentArgs<'map> {
    map.iter()
        .map(|(key, value)| (key.as_ref(), value.clone()))
        .collect()
}
