use axum::{
    body::Body,
    extract::{ConnectInfo, State},
    http::{header::USER_AGENT, Extensions, HeaderMap, Request, Uri},
    middleware::Next,
    response::IntoResponse,
    Extension,
};
use dashmap::DashMap;
use std::{
    net::{IpAddr, SocketAddr},
    time::Duration,
};
use tower_governor::{key_extractor::KeyExtractor, GovernorError};

use crate::internal::{auth::MaybeUser, database::provider::Connection, router::RouterState};

pub fn track_flusher(db: Connection) {
    tokio::task::spawn(async move {
        let duration = Duration::from_secs(30);
        loop {
            tokio::time::sleep(duration).await;
            let mut total_count = 0;
            for mut track in TRACK_CACHE.iter_mut() {
                let key = track.key();
                let count = *track;
                if db
                    .insert_track(key.0, key.1.as_deref(), key.2, count)
                    .await
                    .is_ok()
                {
                    *track -= count;
                    total_count += 1;
                }
            }
            TRACK_CACHE.retain(|_, v| *v > 0);
            TRACK_CACHE.shrink_to_fit();

            if total_count > 0 {
                tracing::trace!(count = total_count, "Flushed tracks");
            }
        }
    });
}

lazy_static::lazy_static! {
    pub static ref TRACK_CACHE: DashMap<(IpAddr, Option<String>, Option<i64>), u64> = DashMap::new();
}

/// Middleware to log the IP and user agent of the client in the database as track.
/// Associates the track with the user if the user is logged in. Runs asynchronously,
/// so it does not block the request and passes on to the next middleware immediately.
pub async fn track_middleware(
    Extension(ip): Extension<Option<IpAddr>>,
    Extension(user): Extension<MaybeUser>,
    uri: Uri,
    req: Request<Body>,
    next: Next,
) -> impl IntoResponse {
    if let Some(ip) = ip {
        let user_id = user.as_ref().map(|u| u.id);
        let user_agent = req
            .headers()
            .get(&USER_AGENT)
            .map(|header| truncate_to_256_chars(header.to_str().unwrap()).to_string());

        tracing::trace!(user_id, uri = uri.to_string(), "Request");
        tokio::task::spawn(async move {
            let mut v = TRACK_CACHE
                .entry((ip, user_agent, user_id))
                .or_insert_with(|| 0);
            *v += 1;
        });
    }

    next.run(req).await
}

/// Only add the `ip_insert` middleware if the `ip_extractor` is not the `default_ip_extractor`
pub async fn ip_insert_middleware(
    state: State<RouterState>,
    mut req: Request<Body>,
    next: Next,
) -> impl IntoResponse {
    let ip = (state.ip_extractor)(req.headers(), req.extensions());
    req.extensions_mut().insert(ip);
    next.run(req).await
}

pub async fn ip_insert_blank_middleware(mut req: Request<Body>, next: Next) -> impl IntoResponse {
    let ip: Option<IpAddr> = None;
    req.extensions_mut().insert(ip);
    next.run(req).await
}

fn truncate_to_256_chars(s: &str) -> &str {
    if s.len() <= 256 {
        s
    } else {
        &s[..256]
    }
}

pub fn maybe_rightmost_x_forwarded_for(headers: &HeaderMap, _: &Extensions) -> Option<IpAddr> {
    headers
        .get_all("X-Forwarded-For")
        .iter()
        .filter_map(|hv| hv.to_str().ok())
        .flat_map(|hv| {
            hv.split(',')
                .filter_map(|s| s.trim().parse::<IpAddr>().ok())
                .collect::<Vec<IpAddr>>()
        })
        .next_back()
}

pub fn maybe_x_real_ip(headers: &HeaderMap, _: &Extensions) -> Option<IpAddr> {
    headers
        .get("X-Real-Ip")
        .and_then(|hv| hv.to_str().ok())
        .and_then(|s| s.parse::<IpAddr>().ok())
}

pub fn maybe_fly_client_ip(headers: &HeaderMap, _: &Extensions) -> Option<IpAddr> {
    headers
        .get("Fly-Client-IP")
        .and_then(|hv| hv.to_str().ok())
        .and_then(|s| s.parse::<IpAddr>().ok())
}

pub fn maybe_true_client_ip(headers: &HeaderMap, _: &Extensions) -> Option<IpAddr> {
    headers
        .get("True-Client-IP")
        .and_then(|hv| hv.to_str().ok())
        .and_then(|s| s.parse::<IpAddr>().ok())
}

pub fn maybe_cf_connecting_ip(headers: &HeaderMap, _: &Extensions) -> Option<IpAddr> {
    headers
        .get("CF-Connecting-IP")
        .and_then(|hv| hv.to_str().ok())
        .and_then(|s| s.parse::<IpAddr>().ok())
}

/// Get client IP from axum's `ConnectInfo`. The axum router must be served with
/// `router.into_make_service_with_connect_info::<SocketAddr>()`
pub fn maybe_peer_ip(_: &HeaderMap, extensions: &Extensions) -> Option<IpAddr> {
    extensions
        .get::<ConnectInfo<SocketAddr>>()
        .map(|addr| addr.ip())
}

pub fn default_ip_extractor(_: &HeaderMap, _: &Extensions) -> Option<IpAddr> {
    None
}

pub type IpExtractorFn = fn(&HeaderMap, &Extensions) -> Option<IpAddr>;

#[derive(Clone)]
pub struct KeyExtractorShim {
    ip_extractor: IpExtractorFn,
}

impl KeyExtractorShim {
    pub fn new(ip_extractor: IpExtractorFn) -> Self {
        Self { ip_extractor }
    }
}

impl KeyExtractor for KeyExtractorShim {
    type Key = IpAddr;

    fn extract<T>(&self, req: &Request<T>) -> std::result::Result<Self::Key, GovernorError> {
        (self.ip_extractor)(req.headers(), req.extensions())
            .map(canonicalize_ip)
            .ok_or(GovernorError::UnableToExtractKey)
    }
}

pub fn canonicalize_ip(ip: IpAddr) -> IpAddr {
    match ip {
        IpAddr::V4(_) => ip,
        IpAddr::V6(ip) => {
            if ip.to_ipv4_mapped().is_some() {
                IpAddr::V6(ip)
            } else {
                // Mask IPv6 to the nearest /64
                let mut segments = ip.segments();
                segments[4] = 0;
                segments[5] = 0;
                segments[6] = 0;
                segments[7] = 0;

                IpAddr::from(segments)
            }
        }
    }
}

#[cfg(test)]
mod test {
    use std::net::IpAddr;

    use axum::{body::Body, http::Request};

    use crate::internal::ip::{
        canonicalize_ip, maybe_cf_connecting_ip, maybe_fly_client_ip,
        maybe_rightmost_x_forwarded_for, maybe_true_client_ip, maybe_x_real_ip,
    };

    #[test]
    fn rightmost_x_forwarded_for() {
        let req = Request::builder()
            .uri("/")
            .header(
                "X-Forwarded-For",
                "1.2.3.4, foo, 2001:db8:85a3:8d3:1319:8a2e:370:7348",
            )
            .header("X-Forwarded-For", "bar")
            .header("X-Forwarded-For", "5.6.7.8")
            .body(Body::empty())
            .unwrap();

        let want: IpAddr = "5.6.7.8".parse().unwrap();
        let result = maybe_rightmost_x_forwarded_for(req.headers(), req.extensions());
        assert_eq!(result, Some(want));
    }

    #[test]
    fn x_real_ip() {
        let req = Request::builder()
            .uri("/")
            .header("X-Real-Ip", "1.2.3.4")
            .body(Body::empty())
            .unwrap();

        let want: Option<IpAddr> = Some("1.2.3.4".parse().unwrap());
        let result = maybe_x_real_ip(req.headers(), req.extensions());
        assert_eq!(result, want);
    }

    #[test]
    fn fly_client_ip() {
        let req = Request::builder()
            .uri("/")
            .header("Fly-Client-IP", "1.2.3.4")
            .body(Body::empty())
            .unwrap();

        let want: Option<IpAddr> = Some("1.2.3.4".parse().unwrap());
        let result = maybe_fly_client_ip(req.headers(), req.extensions());
        assert_eq!(result, want);
    }

    #[test]
    fn true_client_ip() {
        let req = Request::builder()
            .uri("/")
            .header("True-Client-IP", "1.2.3.4")
            .body(Body::empty())
            .unwrap();

        let want: Option<IpAddr> = Some("1.2.3.4".parse().unwrap());
        let result = maybe_true_client_ip(req.headers(), req.extensions());
        assert_eq!(result, want);
    }

    #[test]
    fn cf_connecting_ip() {
        let req = Request::builder()
            .uri("/")
            .header("CF-Connecting-IP", "1.2.3.4")
            .body(Body::empty())
            .unwrap();

        let want: Option<IpAddr> = Some("1.2.3.4".parse().unwrap());
        let result = maybe_cf_connecting_ip(req.headers(), req.extensions());
        assert_eq!(result, want);
    }

    #[test]
    fn canonicalize_ipv4_unchanged() {
        let ip: IpAddr = "1.2.3.4".parse().unwrap();
        let result = canonicalize_ip(ip);
        assert_eq!(ip, result);
    }

    #[test]
    fn canonicalize_ipv6_1() {
        let ip: IpAddr = "2001:DB8::21f:5bff:febf:ce22:8a2e".parse().unwrap();
        let ip_want: IpAddr = "2001:db8:0:21f::".parse().unwrap();
        let result = canonicalize_ip(ip);
        assert_eq!(ip_want, result);
    }

    #[test]
    fn canonicalize_ipv6_ipv4() {
        let ip: IpAddr = "::ffff:1.2.3.4".parse().unwrap();
        let ip_want: IpAddr = "::ffff:1.2.3.4".parse().unwrap();
        let result = canonicalize_ip(ip);
        assert_eq!(ip_want, result);
    }

    #[test]
    fn canonicalize_ipv6_2() {
        let ip: IpAddr = "2001:0db8:85a3:0000:0000:8a2e:0370:7334".parse().unwrap();
        let ip_want: IpAddr = "2001:db8:85a3::".parse().unwrap();
        let result = canonicalize_ip(ip);
        assert_eq!(ip_want, result);
    }

    #[test]
    fn canonicalize_ipv6_3() {
        let ip: IpAddr = "fe80::1ff:fe23:4567:890a".parse().unwrap();
        let ip_want: IpAddr = "fe80::".parse().unwrap();
        let result = canonicalize_ip(ip);
        assert_eq!(ip_want, result);
    }

    #[test]
    fn canonicalize_ipv6_4() {
        let ip: IpAddr = "f:f:f:f:f:f:f:f".parse().unwrap();
        let ip_want: IpAddr = "f:f:f:f::".parse().unwrap();
        let result = canonicalize_ip(ip);
        assert_eq!(ip_want, result);
    }
}
