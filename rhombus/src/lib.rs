//! Host a CTF
#![cfg_attr(docsrs, feature(doc_cfg))]
#![cfg_attr(docsrs, feature(doc_auto_cfg))]

#[cfg(feature = "internal")]
pub mod internal;

#[cfg(not(feature = "internal"))]
mod internal;

/// Known compatible version of the axum web framework
pub use axum;
pub use config;
pub use minijinja;
pub use rhombus_shared;

#[cfg(feature = "libsql")]
pub use libsql;

/// Builder module
pub mod builder;

#[cfg(feature = "libsql")]
pub mod challenge_loader_plugin;

pub mod database_upload_provider;
mod local_upload_provider;
pub mod plugin;
pub mod upload_provider;

#[cfg(feature = "s3")]
pub mod s3_upload_provider;

#[cfg(feature = "systemfd")]
mod systemfd;

/// Common error type for Rhombus
pub mod errors;

/// Simplified error type
#[doc(inline)]
pub use crate::errors::Result;

pub use builder::builder;
pub use builder::Builder;

#[doc(inline)]
pub use plugin::Plugin;

#[doc(inline)]
pub use local_upload_provider::LocalUploadProvider;

#[doc(inline)]
pub use upload_provider::UploadProvider;

#[cfg(feature = "systemfd")]
pub use systemfd::serve_systemfd;

/// Utils for extracting ip address from request
pub mod ip {
    pub use crate::internal::ip::{
        maybe_cf_connecting_ip, maybe_fly_client_ip, maybe_peer_ip,
        maybe_rightmost_x_forwarded_for, maybe_true_client_ip, maybe_x_real_ip,
    };
}
