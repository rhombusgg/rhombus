use axum::{body::Body, extract::State, http::Response, response::IntoResponse};
use chrono::{DateTime, Utc};
use lazy_static::lazy_static;
use minijinja::context;
use resvg::{tiny_skia, usvg};
use rust_embed::RustEmbed;
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;

use crate::builder::find_image_file;
use crate::internal::router::RouterState;

#[derive(RustEmbed)]
#[folder = "fonts"]
struct Fonts;

lazy_static! {
    static ref GLOBAL_OPTIONS: usvg::Options<'static> = {
        let resolve_data = Box::new(|_: &str, _: std::sync::Arc<Vec<u8>>, _: &usvg::Options| None);

        let resolve_string = Box::new(move |href: &str, _: &usvg::Options| {
            let logo = find_image_file("static/logo").and_then(|logo| {
                let data = std::sync::Arc::new(std::fs::read(&logo).unwrap());
                logo.extension().and_then(|ext| match ext.to_str() {
                    Some("svg") => Some(usvg::ImageKind::SVG(
                        usvg::Tree::from_data(&data, &usvg::Options::default()).unwrap(),
                    )),
                    Some("png") => Some(usvg::ImageKind::PNG(data)),
                    Some("webp") => Some(usvg::ImageKind::WEBP(data)),
                    Some("jpg") | Some("jpeg") => Some(usvg::ImageKind::JPEG(data)),
                    Some("gif") => Some(usvg::ImageKind::GIF(data)),
                    _ => None,
                })
            });

            match href {
                "logo" => logo,
                _ => None,
            }
        });

        let mut opt = usvg::Options::default();
        opt.fontdb_mut().load_system_fonts();
        opt.fontdb_mut()
            .load_font_data(Fonts::get("inter/Inter.ttc").unwrap().data.to_vec());
        opt.image_href_resolver = usvg::ImageHrefResolver {
            resolve_data,
            resolve_string,
        };
        opt
    };
}

fn convert_svg_to_png(svg: &str) -> Vec<u8> {
    let tree = usvg::Tree::from_data(svg.as_bytes(), &GLOBAL_OPTIONS).unwrap();
    let pixmap_size = tree.size().to_int_size();
    let mut pixmap = tiny_skia::Pixmap::new(pixmap_size.width(), pixmap_size.height()).unwrap();
    resvg::render(&tree, tiny_skia::Transform::default(), &mut pixmap.as_mut());
    pixmap.encode_png().unwrap()
}

#[derive(Debug, Serialize)]
pub struct SiteOGImage {
    pub title: String,
    pub location_url: String,
    pub description: Option<String>,
    pub start_time: Option<DateTime<Utc>>,
    pub end_time: Option<DateTime<Utc>>,
    pub organizer: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CTFtimeMetaInfo {
    pub teams_interested: u64,
    pub weight: f64,
}

#[derive(Debug, Serialize)]
pub struct TeamMeta {
    pub name: String,
    pub score: u64,
}

#[derive(Debug, Serialize)]
pub struct DivisionMeta {
    pub name: String,
    pub places: Vec<TeamMeta>,
}

lazy_static! {
    pub static ref DEFAULT_IMAGE_CACHE: RwLock<Option<CachedImage>> = None.into();
}

pub struct CachedImage {
    pub at: DateTime<Utc>,
    pub data: Vec<u8>,
}

pub async fn route_default_og_image(state: State<RouterState>) -> impl IntoResponse {
    {
        let image_cache = DEFAULT_IMAGE_CACHE.read().await;
        if image_cache
            .as_ref()
            .map(|cache| Utc::now() < cache.at + chrono::Duration::minutes(5))
            .unwrap_or(false)
        {
            return Response::builder()
                .header("Content-Type", "image/png")
                .body(Body::from(image_cache.as_ref().unwrap().data.clone()))
                .unwrap();
        }
    }

    let site = {
        let settings = state.settings.read().await;
        SiteOGImage {
            title: settings.title.clone(),
            description: settings.description.clone(),
            start_time: settings.start_time,
            end_time: settings.end_time,
            location_url: settings.location_url.clone(),
            organizer: settings.organizer.clone(),
        }
    };

    let stats = state.db.get_site_statistics().await.unwrap();

    let ctftime = match &state.settings.read().await.ctftime {
        Some(ctftime) => 'arm: {
            #[derive(Deserialize)]
            struct CTFTimeQuery {
                participants: i64,
                weight: f64,
            }

            let Ok(response) = reqwest::get(format!(
                "https://ctftime.org/api/v1/events/{}/",
                ctftime.client_id
            ))
            .await
            else {
                break 'arm None;
            };

            let Ok(info) = response.json::<CTFTimeQuery>().await else {
                break 'arm None;
            };

            Some(CTFtimeMetaInfo {
                weight: info.weight,
                teams_interested: info.participants as u64,
            })
        }
        None => None,
    };

    let url = reqwest::Url::parse(&site.location_url).unwrap();
    let location = url
        .as_str()
        .trim_start_matches(url.scheme())
        .trim_start_matches("://")
        .trim_end_matches("/");

    let ctf_started = site
        .start_time
        .map(|start_time| chrono::Utc::now() > start_time)
        .unwrap_or(true);

    let ctf_ended = site
        .end_time
        .map(|end_time| chrono::Utc::now() > end_time)
        .unwrap_or(false);

    let ctf_start_time = site
        .start_time
        .map(|start_time| start_time.format("%A, %B %-d, %Y at %H:%MZ").to_string());

    let ctf_end_time = site
        .end_time
        .map(|end_time| end_time.format("%A, %B %-d, %Y at %H:%MZ").to_string());

    let mut division_meta = Vec::with_capacity(state.divisions.len());
    for division in state.divisions.iter() {
        let mut places = Vec::with_capacity(3);
        let leaderboard = state
            .db
            .get_leaderboard(division.id, Some(0))
            .await
            .unwrap();
        leaderboard.entries.iter().take(3).for_each(|entry| {
            places.push(TeamMeta {
                name: entry.team_name.clone(),
                score: entry.score as u64,
            });
        });

        division_meta.push(DivisionMeta {
            name: division.name.clone(),
            places,
        });
    }

    let svg = state
        .jinja
        .get_template("og.svg")
        .unwrap()
        .render(context! {
            title => "Rhombus",
            site,
            stats,
            ctftime,
            ctf_started,
            ctf_ended,
            location,
            ctf_start_time,
            ctf_end_time,
            division_meta,
        })
        .unwrap();

    let png = convert_svg_to_png(&svg);

    let new_image = CachedImage {
        at: Utc::now(),
        data: png.clone(),
    };
    {
        _ = DEFAULT_IMAGE_CACHE.write().await.replace(new_image);
    }

    Response::builder()
        .header("Content-Type", "image/png")
        .body(Body::from(png))
        .unwrap()
}
