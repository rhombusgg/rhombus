use axum::{body::Body, extract::State, http::Response, response::IntoResponse};
use lazy_static::lazy_static;
use minijinja::context;
use resvg::tiny_skia;
use resvg::usvg;
use rust_embed::RustEmbed;

use super::router::RouterState;

#[derive(RustEmbed)]
#[folder = "fonts"]
struct Fonts;

// lazy_static! {
//     static ref GLOBAL_OPTIONS: usvg::Options<'static> = {
//         let mut opt = usvg::Options::default();
//         opt.fontdb_mut().load_system_fonts();
//         opt.fontdb_mut()
//             .load_font_data(Fonts::get("inter/Inter.ttc").unwrap().data.to_vec());
//         opt
//     };
// }

// todo: cache between requests
fn convert_svg_to_png(svg: &str) -> Vec<u8> {
    let ferris_image = std::sync::Arc::new(std::fs::read("./static/logo.svg").unwrap());

    let resolve_data = Box::new(|_: &str, _: std::sync::Arc<Vec<u8>>, _: &usvg::Options| None);

    let resolve_string = Box::new(move |href: &str, _: &usvg::Options| match href {
        "ferris_image" => Some(usvg::ImageKind::SVG(
            usvg::Tree::from_data(&ferris_image, &usvg::Options::default()).unwrap(),
        )),
        _ => None,
    });

    let mut opt = usvg::Options::default();
    opt.fontdb_mut().load_system_fonts();
    opt.fontdb_mut()
        .load_font_data(Fonts::get("inter/Inter.ttc").unwrap().data.to_vec());
    opt.image_href_resolver = usvg::ImageHrefResolver {
        resolve_data,
        resolve_string,
    };

    let tree = usvg::Tree::from_data(svg.as_bytes(), &opt).unwrap();
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
