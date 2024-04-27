use axum::{
    body::Body,
    http::{header::ACCEPT_LANGUAGE, Request},
    middleware::Next,
    response::IntoResponse,
};
use fluent::{bundle::FluentBundle, FluentArgs, FluentResource, FluentValue};
use intl_memoizer::concurrent::IntlLangMemoizer;
use minijinja::{value::Kwargs, State};
use rust_embed::RustEmbed;
use std::collections::HashMap;
use unic_langid::{langid, LanguageIdentifier};

pub type BundleMap = HashMap<LanguageIdentifier, FluentBundle<FluentResource, IntlLangMemoizer>>;

pub struct Localizations {
    pub bundles: BundleMap,
}

const ENGLISH: LanguageIdentifier = langid!("en");

#[derive(RustEmbed)]
#[folder = "locales"]
struct Locales;

impl Localizations {
    pub fn new() -> Self {
        let mut bundles = HashMap::new();

        for file in Locales::iter() {
            let bytes = Locales::get(&file).unwrap();
            let source = std::str::from_utf8(bytes.data.as_ref()).unwrap();

            let (lang, _) = file.split_once('/').unwrap();
            let lang = lang.parse::<LanguageIdentifier>().unwrap();

            let resource = FluentResource::try_new(source.to_owned()).unwrap();
            let bundle = bundles
                .entry(lang.clone())
                .or_insert_with(move || FluentBundle::new_concurrent(vec![lang]));
            bundle.add_resource_overriding(resource);
        }

        Localizations { bundles }
    }

    pub fn localize(
        &self,
        languages: Vec<LanguageIdentifier>,
        msg_id: &str,
        args: Option<&HashMap<&str, FluentValue>>,
    ) -> Option<String> {
        let available_languages: Vec<LanguageIdentifier> = self
            .bundles
            .keys()
            .map(|l| l.to_owned())
            .collect::<Vec<_>>();
        let default = ENGLISH;
        let languages = negotiate_languages(&languages, &available_languages, Some(&default));
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

pub fn translate(localizer: &Localizations, msg_id: &str, kwargs: Kwargs, state: &State) -> String {
    let langs = state
        .lookup("lang")
        .unwrap()
        .as_seq()
        .unwrap()
        .iter()
        .map(|v| {
            v.as_str()
                .unwrap()
                .to_owned()
                .parse::<LanguageIdentifier>()
                .unwrap()
        })
        .collect::<Vec<LanguageIdentifier>>();

    let mut args = HashMap::new();
    for key in kwargs.args() {
        let val: &str = kwargs.get(key).unwrap();
        args.insert(key, val.into());
    }
    kwargs.assert_all_used().unwrap();

    let text = localizer.localize(langs, msg_id, Some(&args));

    text.unwrap_or(format!("Translation not found for {}", msg_id))
}

pub type Lang = Vec<String>;

pub async fn locale(mut req: Request<Body>, next: Next) -> impl IntoResponse {
    let langs = req
        .headers()
        .get(&ACCEPT_LANGUAGE)
        .map(|header| parse_languages(header.to_str().unwrap()))
        .unwrap_or(vec!["en".to_owned()]);
    req.extensions_mut().insert(langs);
    next.run(req).await
}

fn parse_languages(raw_languages: &str) -> Lang {
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
        .map(|l| l.to_string())
        .collect()
}

fn filter_matches<'a, R: 'a + AsRef<LanguageIdentifier>, A: 'a + AsRef<LanguageIdentifier>>(
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

fn into_specificity(lang: &LanguageIdentifier) -> usize {
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

fn negotiate_languages<
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

fn map_to_fluent_args<'map, T: AsRef<str>>(map: &'map HashMap<T, FluentValue>) -> FluentArgs<'map> {
    map.iter()
        .map(|(key, value)| (key.as_ref(), value.clone()))
        .collect()
}
