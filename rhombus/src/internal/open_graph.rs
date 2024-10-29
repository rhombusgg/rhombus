use std::collections::BTreeMap;
use std::sync::LazyLock;
use std::time::Duration;

use axum::extract::Path;
use axum::Json;
use axum::{body::Body, extract::State, http::Response, response::IntoResponse};
use chrono::{DateTime, Utc};
use dashmap::DashMap;
use minijinja::context;
use resvg::{tiny_skia, usvg};
use rust_embed::RustEmbed;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tokio::sync::RwLock;
use unicode_segmentation::UnicodeSegmentation;

use crate::builder::find_image_file;
use crate::internal::{
    database::{cache::TimedCache, provider::StatisticsCategory},
    router::RouterState,
};

#[derive(RustEmbed)]
#[folder = "fonts"]
struct Fonts;

static GLOBAL_OPTIONS: LazyLock<usvg::Options<'static>> = LazyLock::new(|| {
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
});

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

pub static DEFAULT_IMAGE_CACHE: LazyLock<RwLock<Option<CachedImage>>> =
    LazyLock::new(RwLock::default);

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
            .get_leaderboard(&division.id, Some(0))
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

    let description = site.description.as_ref().map(|desc| wrap_text(desc, 74));

    let svg = state
        .jinja
        .get_template("og.svg")
        .unwrap()
        .render(context! {
            site,
            stats,
            ctftime,
            ctf_started,
            ctf_ended,
            location,
            ctf_start_time,
            ctf_end_time,
            division_meta,
            description,
        })
        .unwrap();

    let png = convert_svg_to_png(&svg);

    let new_image = CachedImage {
        at: Utc::now(),
        data: png.clone(),
    };
    {
        DEFAULT_IMAGE_CACHE.write().await.replace(new_image);
    }

    Response::builder()
        .header("Content-Type", "image/png")
        .body(Body::from(png))
        .unwrap()
}

pub static TEAM_OG_IMAGE_CACHE: LazyLock<DashMap<i64, TimedCache<Vec<u8>>>> =
    LazyLock::new(DashMap::new);

pub async fn route_team_og_image(
    state: State<RouterState>,
    team_id: Path<i64>,
) -> impl IntoResponse {
    let Ok(team) = state.db.get_team_from_id(team_id.0).await else {
        return Json(json!({
            "error": "Team not found",
        }))
        .into_response();
    };

    if let Some(png) = TEAM_OG_IMAGE_CACHE.get(&team_id) {
        return Response::builder()
            .header("Content-Type", "image/png")
            .body(Body::from(png.value.clone()))
            .unwrap();
    }

    let challenge_data = state.db.get_challenges();
    let standing = state.db.get_team_standing(team_id.0, &team.division_id);
    let (challenge_data, standings) = tokio::join!(challenge_data, standing);
    let challenge_data = challenge_data.unwrap();
    let standing = standings.unwrap();

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

    let num_writeups: usize = team.writeups.values().map(|w| w.len()).sum();

    let num_solves = team.solves.len();
    let num_users = team.users.len();

    let mut categories = BTreeMap::<String, StatisticsCategory>::new();
    for challenge_id in team.solves.keys() {
        let challenge = challenge_data.challenges.get(challenge_id).unwrap();
        let category = challenge_data
            .categories
            .get(&challenge.category_id)
            .unwrap();
        categories
            .entry(category.id.clone())
            .and_modify(|c| c.num += 1)
            .or_insert_with(|| StatisticsCategory {
                color: category.color.clone(),
                name: category.name.clone(),
                num: 1,
            });
    }
    let mut categories = categories.values().collect::<Vec<_>>();
    categories.sort();

    let description = site.description.as_ref().map(|desc| wrap_text(desc, 74));

    let svg = state
        .jinja
        .get_template("og-team.svg")
        .unwrap()
        .render(context! {
            site,
            ctf_started,
            ctf_ended,
            location,
            ctf_start_time,
            ctf_end_time,
            divisions => state.divisions,
            standing,
            num_solves,
            num_users,
            categories,
            team,
            num_writeups,
            description,
        })
        .unwrap();

    let png = convert_svg_to_png(&svg);

    let cache = TimedCache::new(png.clone());
    {
        TEAM_OG_IMAGE_CACHE.insert(team_id.0, cache);
    }

    Response::builder()
        .header("Content-Type", "image/png")
        .body(Body::from(png))
        .unwrap()
}

pub static USER_OG_IMAGE_CACHE: LazyLock<DashMap<i64, TimedCache<Vec<u8>>>> =
    LazyLock::new(DashMap::new);

pub async fn route_user_og_image(
    state: State<RouterState>,
    user_id: Path<i64>,
) -> impl IntoResponse {
    let Ok(user) = state.db.get_user_from_id(user_id.0).await else {
        return Json(json!({
            "error": "User not found",
        }))
        .into_response();
    };

    if let Some(png) = USER_OG_IMAGE_CACHE.get(&user_id) {
        return Response::builder()
            .header("Content-Type", "image/png")
            .body(Body::from(png.value.clone()))
            .unwrap();
    }

    let challenge_data = state.db.get_challenges();
    let team = state.db.get_team_from_id(user.team_id);
    let (challenge_data, team) = tokio::join!(challenge_data, team);
    let challenge_data = challenge_data.unwrap();
    let team = team.unwrap();

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

    let mut categories = BTreeMap::<String, StatisticsCategory>::new();
    let mut num_solves = 0;
    for (challenge_id, solve) in team.solves.iter() {
        if solve.user_id != user.id {
            continue;
        }

        num_solves += 1;

        let challenge = challenge_data.challenges.get(challenge_id).unwrap();
        let category = challenge_data
            .categories
            .get(&challenge.category_id)
            .unwrap();
        categories
            .entry(category.id.clone())
            .and_modify(|c| c.num += 1)
            .or_insert_with(|| StatisticsCategory {
                color: category.color.clone(),
                name: category.name.clone(),
                num: 1,
            });
    }
    let mut categories = categories.values().collect::<Vec<_>>();
    categories.sort();

    let description = site.description.as_ref().map(|desc| wrap_text(desc, 74));

    let svg = state
        .jinja
        .get_template("og-user.svg")
        .unwrap()
        .render(context! {
            site,
            ctf_started,
            ctf_ended,
            location,
            ctf_start_time,
            ctf_end_time,
            divisions => state.divisions,
            num_solves,
            categories,
            user,
            team,
            description,
        })
        .unwrap();

    let png = convert_svg_to_png(&svg);

    let cache = TimedCache::new(png.clone());
    {
        USER_OG_IMAGE_CACHE.insert(user_id.0, cache);
    }

    Response::builder()
        .header("Content-Type", "image/png")
        .body(Body::from(png))
        .unwrap()
}

pub fn open_graph_cache_evictor(seconds: u64) {
    tokio::task::spawn(async move {
        let duration = Duration::from_secs(seconds);
        loop {
            tokio::time::sleep(duration).await;
            let evict_threshold = (chrono::Utc::now() - duration).timestamp();

            let mut count: i64 = 0;
            TEAM_OG_IMAGE_CACHE.retain(|_, v| {
                if v.insert_timestamp > evict_threshold {
                    true
                } else {
                    count += 1;
                    false
                }
            });
            if count > 0 {
                tracing::trace!(count, "Evicted team og image cache");
            }

            let mut count: i64 = 0;
            USER_OG_IMAGE_CACHE.retain(|_, v| {
                if v.insert_timestamp > evict_threshold {
                    true
                } else {
                    count += 1;
                    false
                }
            });
            if count > 0 {
                tracing::trace!(count, "Evicted user og image cache");
            }
        }
    });
}

fn wrap_text(text: &str, max_width: usize) -> Vec<String> {
    let mut lines = Vec::new();
    let mut current_line = String::new();
    let mut line_len = 0;

    for word in text.split_whitespace() {
        let word_len = word.graphemes(true).count();

        if line_len + word_len > max_width {
            lines.push(current_line);
            current_line = String::new();
            line_len = 0;
        }

        if line_len > 0 {
            current_line.push(' ');
            line_len += 1;
        }

        current_line.push_str(word);
        line_len += word_len;
    }

    if !current_line.is_empty() {
        lines.push(current_line);
    }

    lines
}
