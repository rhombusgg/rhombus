use axum::{body::Body, extract::State, http::Response, response::IntoResponse};
use cached::proc_macro::cached;
use lazy_static::lazy_static;
use minijinja::context;
use resvg::tiny_skia;
use resvg::usvg;
use rust_embed::RustEmbed;

use super::router::RouterState;

#[derive(RustEmbed)]
#[folder = "fonts"]
struct Fonts;

lazy_static! {
    static ref GLOBAL_FONTDB: std::sync::Mutex<usvg::fontdb::Database> = {
        let mut fontdb = usvg::fontdb::Database::new();
        fontdb.load_font_data(Fonts::get("inter/Inter.ttc").unwrap().data.to_vec());
        std::sync::Mutex::new(fontdb)
    };
}

#[cached(time = 120, key = "String", convert = "{ svg.to_string() }")]
fn convert_svg_to_png(svg: &str) -> Vec<u8> {
    let opt = usvg::Options::default();
    let tree = {
        let fontdb = GLOBAL_FONTDB.lock().unwrap();
        usvg::Tree::from_str(svg, &opt, &fontdb).unwrap()
    };
    let zoom = 2.0;
    let pixmap_size = tree.size().to_int_size().scale_by(zoom).unwrap();
    let mut pixmap = tiny_skia::Pixmap::new(pixmap_size.width(), pixmap_size.height()).unwrap();
    let render_ts = tiny_skia::Transform::from_scale(zoom, zoom);
    resvg::render(&tree, render_ts, &mut pixmap.as_mut());
    pixmap.encode_png().unwrap()
}

pub async fn route_default_og_image(state: State<RouterState>) -> impl IntoResponse {
    let svg = state
        .jinja
        .get_template("og.svg")
        .unwrap()
        .render(context! {
            title => "Rhombus",
        })
        .unwrap();

    let png = convert_svg_to_png(&svg);

    Response::builder()
        .header("Content-Type", "image/png")
        .body(Body::from(png))
        .unwrap()
}
