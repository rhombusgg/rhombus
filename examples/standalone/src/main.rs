use std::net::IpAddr;

use http::{HeaderMap, Request};
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env()
                .or_else(|_| EnvFilter::try_new("rhombus=trace"))
                .unwrap(),
        )
        .init();

    let app = rhombus::Builder::default()
        .load_env()
        .config_override("location_url", "http://localhost:3000")
        .database("file://rhombus.db".into())
        .config_source(rhombus::config::File::with_name("config"))
        .extractor(Extractor)
        // .database("postgres://postgres:password@localhost".into())
        .build()
        .await
        .unwrap();

    rhombus::serve(app, "0.0.0.0:3000").await.unwrap();
}

#[derive(Default, Clone)]
struct Extractor;
impl rhombus::IpExtractor for Extractor {
    fn extract<T>(&self, req: &Request<T>) -> Option<IpAddr> {
        maybe_x_real_ip(req.headers())
    }
}

fn maybe_x_real_ip(headers: &HeaderMap) -> Option<IpAddr> {
    headers
        .get("x-real-ip")
        .and_then(|hv| hv.to_str().ok())
        .and_then(|s| s.parse::<IpAddr>().ok())
}
