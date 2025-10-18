use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
};

use base64::{engine::general_purpose::STANDARD, Engine};
use rust_embed::RustEmbed;
use serde_json::json;

#[derive(RustEmbed)]
#[folder = "templates"]
struct EmbeddedTemplates;

pub struct Templates {
    pub plugin_map: Arc<Mutex<HashMap<String, String>>>,
    pub core_map: Arc<Mutex<HashMap<String, String>>>,
}

impl Default for Templates {
    fn default() -> Self {
        Self::new()
    }
}

impl Templates {
    pub fn new() -> Self {
        let mut map = HashMap::new();

        for file in EmbeddedTemplates::iter() {
            let mut bytes = EmbeddedTemplates::get(&file).unwrap().data.to_vec();
            let cfg = &minify_html_onepass::Cfg {
                minify_js: true,
                minify_css: true,
            };
            if file.ends_with(".html") {
                minify_html_onepass::truncate(&mut bytes, cfg).unwrap();
            }
            let content = String::from_utf8(bytes).unwrap();

            map.insert(file.to_string(), content);
        }

        Self {
            core_map: Arc::new(Mutex::new(map)),
            plugin_map: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn add_template(&mut self, name: &str, content: &str) {
        let content = if name.ends_with(".html") {
            let mut bytes = content.as_bytes().to_vec();
            let cfg = &minify_html_onepass::Cfg {
                minify_js: true,
                minify_css: true,
            };
            minify_html_onepass::truncate(&mut bytes, cfg).unwrap();
            String::from_utf8(bytes).unwrap()
        } else {
            content.to_string()
        };

        self.plugin_map
            .lock()
            .unwrap()
            .entry(name.to_string())
            .and_modify(|previous_content| {
                *previous_content = format!("{previous_content}\n{content}");
            })
            .or_insert(content);
    }

    pub fn set_template(&mut self, name: &str, content: &str) {
        let content = if name.ends_with(".html") {
            let mut bytes = content.as_bytes().to_vec();
            let cfg = &minify_html_onepass::Cfg {
                minify_js: true,
                minify_css: true,
            };
            minify_html_onepass::truncate(&mut bytes, cfg).unwrap();
            String::from_utf8(bytes).unwrap()
        } else {
            content.to_string()
        };

        self.plugin_map
            .lock()
            .unwrap()
            .insert(name.to_string(), content);
    }

    pub fn build(&self) -> minijinja::Environment<'static> {
        let mut jinja = minijinja::Environment::new();
        let core_map = self.core_map.clone();
        let plugin_map = self.plugin_map.clone();

        jinja.set_loader(move |name| {
            if let Some(s) = plugin_map.lock().unwrap().remove(name) {
                Ok(Some(s))
            } else if let Some(s) = core_map.lock().unwrap().remove(name) {
                Ok(Some(s))
            } else {
                Ok(None)
            }
        });

        jinja
    }
}

pub enum ToastKind {
    Success,
    Error,
}

pub fn base64_encode(message: &str) -> String {
    STANDARD.encode(message.as_bytes())
}

pub fn toast_header(kind: ToastKind, message: &str) -> String {
    let message = base64_encode(message);
    let kind = match kind {
        ToastKind::Success => "success",
        ToastKind::Error => "error",
    };

    json!({
        "toast": {
            "kind": kind,
            "message": message,
        }
    })
    .to_string()
}
