# IP Extractor

Particularly for auditing reasons, it is often necessary to know the true public IP address of a client.

## Presets

There a few default extractors available. Select the one that fits your environment best.

- `peer-ip`: The direct IP address of the peer that connected to the server
- `rightmost-x-forwarded-for`: The rightmost IP address in the `X-Forwarded-For` header
- `x-real-ip`: The `X-Real-IP` header, commonly used by Nginx
- `fly-client-ip`: The `Fly-Client-IP` header, used by [Fly.io](https://fly.io)
- `cf-connecting-ip`: The `CF-Connecting-IP` header, used by [Cloudflare](https://cloudflare.com)
- `true-client-ip`: The `True-Client-IP` header

This value can be used in the `ip_preset` field of the `config.yaml` file.

```yaml
ip_preset: peer-ip
```

## Custom Extractors

In your `main.rs` where you initialize Rhombus, create a function which effectively takes the headers of a request, and potentially pulls out the IP address.

```rust
use http::{header::HeaderMap, Extensions};
use std::net::IpAddr;

/// Extracts the IP address from the `Custom-Client-IP` header
pub fn maybe_custom_client_ip(headers: &HeaderMap, _: &Extensions) -> Option<IpAddr> {
    headers
        .get("Custom-Client-IP")
        .and_then(|hv| hv.to_str().ok())
        .and_then(|s| s.parse::<IpAddr>().ok())
}
```

Then, you can use this function to configure your Builder:

```rust
let app = rhombus::Builder::default()
    // ...
    .extractor(maybe_custom_client_ip)
    // ...
```
