use std::collections::HashMap;

pub struct Templates<'a> {
    pub map: HashMap<String, String>,
    phantom: std::marker::PhantomData<&'a ()>,
}

impl<'a> Default for Templates<'a> {
    fn default() -> Self {
        Self::new()
    }
}

impl<'a> Templates<'a> {
    pub fn new() -> Self {
        Self {
            map: HashMap::new(),
            phantom: std::marker::PhantomData,
        }
    }

    pub fn add_template(&mut self, name: String, content: String) {
        self.map
            .entry(name)
            .and_modify(|previous_content| {
                *previous_content = format!("{}\n{}", previous_content, content);
            })
            .or_insert(content);
    }

    pub fn set_to_env(&'a self) -> minijinja::Environment<'a> {
        let mut jinja = minijinja::Environment::new();
        minijinja_embed::load_templates!(&mut jinja);

        for (name, content) in &self.map {
            jinja.add_template(name, content).unwrap();
        }
        jinja
    }
}
