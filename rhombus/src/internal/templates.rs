use std::collections::HashMap;

use rust_embed::RustEmbed;
use tokio::sync::RwLock;

#[derive(RustEmbed)]
#[folder = "templates"]
struct EmbeddedTemplates;

pub struct Templates<'a> {
    pub plugin_map: HashMap<String, String>,
    pub core_map: HashMap<String, String>,
    pub jinja: RwLock<minijinja::Environment<'a>>,
}

impl<'a> Default for Templates<'a> {
    fn default() -> Self {
        Self::new()
    }
}

impl<'a> Templates<'a> {
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
            core_map: map,
            plugin_map: HashMap::new(),
            jinja: RwLock::new(minijinja::Environment::new()),
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
            .entry(name.to_string())
            .and_modify(|previous_content| {
                *previous_content = format!("{}\n{}", previous_content, content);
            })
            .or_insert(content);
    }

    pub fn build(&'a self) -> minijinja::Environment<'a> {
        let mut jinja = minijinja::Environment::new();

        for (name, content) in &self.core_map {
            jinja.add_template(name, content).unwrap();
        }

        for (name, content) in &self.plugin_map {
            jinja.add_template(name, content).unwrap();
        }

        jinja
    }
}
