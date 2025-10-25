use crate::get_client;
use anyhow::Result;
use clap::Subcommand;
use colored::{ColoredString, Colorize};
use rand::{
    distr::{Alphanumeric, SampleString},
    rng,
};
use reqwest::Body;
use rhombus_shared::challenges::{
    diff_challenges, load_challenges, update_challenges_request, upload_files,
    AttachmentIntermediate, ChallengeIntermediate, ChallengeUpdateIntermediate,
    ChallengesIntermediate,
};
use rhombus_shared::proto::GetChallengesAdminRequest;
use serde_json::Value;
use std::{
    collections::{BTreeMap, HashSet},
    path::{Path, PathBuf},
};
use tokio::fs::File;
use tokio_util::codec::{BytesCodec, FramedRead};

#[derive(Subcommand, Debug)]
pub enum AdminCommand {
    /// Apply the change you have made to challenges to the Rhombus server.
    Apply(ApplyCommand),
    /// Generate an random API key with an embedded URL to use as the root_api_key in a Rhombus config.
    GenerateApiKey(GenerateApiKeyCommand),
}

impl AdminCommand {
    pub async fn run(&self) -> Result<()> {
        match self {
            AdminCommand::Apply(apply_command) => apply_command.run().await,
            AdminCommand::GenerateApiKey(generate_api_key_command) => {
                generate_api_key_command.run().await
            }
        }
    }
}

#[derive(clap::Parser, Debug)]
pub struct GenerateApiKeyCommand {
    #[arg(short, long)]
    url: Option<String>,
}

impl GenerateApiKeyCommand {
    pub async fn run(&self) -> Result<()> {
        let url = match &self.url {
            Some(url) => url.clone(),
            None => inquire::prompt_text("Rhombus URL?")?,
        };
        println!(
            "{}_{}",
            base32::encode(
                base32::Alphabet::Rfc4648Lower { padding: false },
                url.as_bytes()
            ),
            Alphanumeric.sample_string(&mut rng(), 32)
        );
        Ok(())
    }
}

#[derive(clap::Parser, Debug)]
pub struct ApplyCommand {}

impl ApplyCommand {
    pub async fn run(&self) -> Result<()> {
        let mut client = get_client().await?;
        let new_challenges = load_challenges(&PathBuf::from("loader.yaml")).await?;

        let response = client
            .client
            .get_challenges_admin(GetChallengesAdminRequest {})
            .await?
            .into_inner();

        let old_challenges = ChallengesIntermediate {
            challenges: response
                .challenges
                .into_iter()
                .map(|challenge| {
                    (
                        challenge.id.clone(),
                        ChallengeIntermediate {
                            stable_id: challenge.id,
                            author: challenge.author,
                            category: challenge.category,
                            description: challenge.description,
                            files: challenge
                                .attachments
                                .into_iter()
                                .map(AttachmentIntermediate::Literal)
                                .collect(),
                            flag: challenge.flag,
                            healthscript: challenge.healthscript,
                            name: challenge.name,
                            ticket_template: challenge.ticket_template,
                            metadata: serde_json::from_str(&challenge.metadata).unwrap_or_default(),
                            score_type: challenge.score_type,
                        },
                    )
                })
                .collect::<BTreeMap<_, _>>(),
            authors: response
                .authors
                .into_iter()
                .map(|author| (author.id.clone(), author))
                .collect(),
            categories: response
                .categories
                .into_iter()
                .map(|category| (category.id.clone(), category))
                .collect(),
        };

        let difference = diff_challenges(&old_challenges, &new_challenges);

        if difference.is_empty() {
            println!("Already up to date");
            return Ok(());
        }

        render_difference(&difference);

        if !inquire::prompt_confirmation("Apply changes (y/n)?")? {
            println!("✗ Aborted");
            return Ok(());
        }

        let uploaded_files = upload_files(&difference, |upload| {
            let upload = upload.clone();
            let client = &client;
            async move { upload_file(&upload.name, &upload.path, &client.url, &client.key).await }
        })
        .await?;

        let request = update_challenges_request(&difference, &uploaded_files);

        client.client.update_challenges(request).await?;
        println!("✓ Changes applied");

        Ok(())
    }
}

pub async fn upload_file(name: &str, path: &Path, location_url: &str, key: &str) -> Result<String> {
    let url = format!("{}/upload/{}", location_url, urlencoding::encode(name));
    let file = File::open(path).await?;
    let body = Body::wrap_stream(FramedRead::new(file, BytesCodec::new()));
    let client = reqwest::Client::new();
    let response = client.post(url).bearer_auth(key).body(body).send().await?;
    let uploaded_url = response.text().await?;
    Ok(uploaded_url)
}

fn render_difference(difference: &[ChallengeUpdateIntermediate]) {
    let ignored_metadata_keys = [
        "author",
        "category",
        "description",
        "healthscript",
        "ticket_template",
        "score_type",
        "files",
    ]
    .into_iter()
    .collect::<HashSet<_>>();

    let mut renderer = DiffRenderer::new();
    for item in difference {
        if let ChallengeUpdateIntermediate::CreateAuthor(author) = item {
            println!("{}", "Create author:".green());
            renderer.indent();
            renderer.attribute("stable_id", author.id.as_str());
            renderer.attribute("name", author.name.as_str());
            renderer.attribute("avatar", author.avatar.as_str());
            renderer.attribute("discord_id", author.discord_id);
            renderer.unindent();
            println!();
        }
    }
    for item in difference {
        if let ChallengeUpdateIntermediate::EditAuthor { old, new } = item {
            println!("{}", "Edit author:".yellow());
            renderer.indent();
            renderer.attribute("stable_id", old.id.as_str());
            renderer.attribute_if_changed("name", old.name.as_str(), new.name.as_str());
            renderer.attribute_if_changed("avatar", old.avatar.as_str(), new.avatar.as_str());
            renderer.attribute_if_changed("discord_id", old.discord_id, new.discord_id);

            renderer.unindent();
            println!();
        }
    }
    for item in difference {
        if let ChallengeUpdateIntermediate::DeleteAuthor { stable_id } = item {
            println!("{}", "Delete author:".red());
            renderer.indent();
            renderer.attribute("stable_id", stable_id.as_str());
            renderer.unindent();
            println!();
        }
    }

    for item in difference {
        if let ChallengeUpdateIntermediate::CreateCategory(category) = item {
            println!("{}", "Create category:".green());
            renderer.indent();
            renderer.attribute("stable_id", category.id.as_str());
            renderer.attribute("name", category.name.as_str());
            renderer.attribute("color", category.color.as_str());
            renderer.attribute("sequence", category.sequence);
            renderer.unindent();
            println!();
        }
    }
    for item in difference {
        if let ChallengeUpdateIntermediate::EditCategory { old, new } = item {
            println!("{}", "Edit category:".yellow());
            renderer.indent();
            renderer.attribute("stable_id", old.id.as_str());
            renderer.attribute_if_changed("name", old.name.as_str(), new.name.as_str());
            renderer.attribute_if_changed("avatar", old.color.as_str(), new.color.as_str());
            renderer.attribute_if_changed("sequence", old.sequence, new.sequence);
            renderer.unindent();
            println!();
        }
    }
    for item in difference {
        if let ChallengeUpdateIntermediate::DeleteCategory { stable_id } = item {
            println!("{}", "Delete category:".red());
            renderer.indent();
            renderer.attribute("stable_id", stable_id.as_str());
            renderer.unindent();
            println!();
        }
    }

    for item in difference {
        if let ChallengeUpdateIntermediate::CreateChallenge(challenge) = item {
            println!("{}", "Create challenge:".green());
            renderer.indent();
            renderer.attribute("stable_id", challenge.stable_id.as_str());
            renderer.attribute("author", challenge.author.as_str());
            renderer.attribute("category", challenge.category.as_str());
            renderer.attribute("description", challenge.description.as_str());
            renderer.attribute("flag", challenge.flag.as_str());
            renderer.attribute("name", challenge.name.as_str());
            renderer.attribute("healthscript", challenge.healthscript.as_deref());
            renderer.attribute("ticket_template", challenge.ticket_template.as_deref());
            renderer.attribute("score_type", challenge.score_type.as_str());
            if let Value::Object(metadata) = challenge.metadata.clone() {
                for (key, value) in metadata
                    .into_iter()
                    .filter(|(key, _)| !ignored_metadata_keys.contains(key.as_str()))
                {
                    renderer.attribute(&key, value);
                }
            } else {
                renderer.attribute("metadata", challenge.metadata.clone());
            }
            renderer.block("files");
            for file in challenge.files.iter() {
                renderer.file(file);
            }
            renderer.unindent();
            renderer.unindent();
            println!();
        }
    }
    for item in difference {
        if let ChallengeUpdateIntermediate::EditChallenge { old, new } = item {
            println!("{}", "Edit challenge:".yellow());
            renderer.indent();
            renderer.attribute("stable_id", old.stable_id.as_str());
            renderer.attribute_if_changed("author", old.author.as_str(), new.author.as_str());
            renderer.attribute_if_changed("category", old.category.as_str(), new.category.as_str());
            renderer.attribute_if_changed(
                "description",
                old.description.as_str(),
                new.description.as_str(),
            );
            renderer.attribute_if_changed("flag", old.flag.as_str(), new.flag.as_str());
            renderer.attribute_if_changed("name", old.name.as_str(), new.name.as_str());
            renderer.attribute_if_changed(
                "healthscript",
                old.healthscript.as_deref(),
                new.healthscript.as_deref(),
            );
            renderer.attribute_if_changed(
                "ticket_template",
                old.ticket_template.as_deref(),
                new.ticket_template.as_deref(),
            );
            renderer.attribute_if_changed(
                "score_type",
                old.score_type.as_str(),
                new.score_type.as_str(),
            );
            if let (Value::Object(old_metadata), Value::Object(new_metadata)) =
                (old.metadata.clone(), new.metadata.clone())
            {
                for (key, old_value) in old_metadata
                    .iter()
                    .filter(|(key, _)| !ignored_metadata_keys.contains(key.as_str()))
                {
                    renderer.attribute_if_changed(
                        key,
                        old_value.clone(),
                        new_metadata.get(key).cloned(),
                    );
                }
                for (key, new_value) in new_metadata.into_iter().filter(|(key, _)| {
                    !old_metadata.contains_key(key) && !ignored_metadata_keys.contains(key.as_str())
                }) {
                    renderer.attribute_if_changed(&key, Value::Null, new_value);
                }
            } else {
                renderer.attribute_if_changed(
                    "metadata",
                    old.metadata.clone(),
                    new.metadata.clone(),
                );
            }
            let mut file_changes = vec![];

            let name_to_old_file = old
                .files
                .iter()
                .map(|file| (file.name(), file))
                .collect::<BTreeMap<_, _>>();
            let name_to_new_file = new
                .files
                .iter()
                .map(|file| (file.name(), file))
                .collect::<BTreeMap<_, _>>();

            if name_to_old_file.len() != old.files.len()
                || name_to_new_file.len() != new.files.len()
            {
                for old_file in old.files.iter() {
                    file_changes.push((Some(old_file), None));
                }
                for new_file in new.files.iter() {
                    file_changes.push((None, Some(new_file)));
                }
            } else {
                for old_file in old
                    .files
                    .iter()
                    .filter(|file| !name_to_new_file.contains_key(file.name()))
                {
                    file_changes.push((Some(old_file), None));
                }
                for new_file in new.files.iter() {
                    let old_file = name_to_old_file.get(new_file.name()).copied();
                    if old_file != Some(new_file) {
                        file_changes.push((
                            name_to_old_file.get(new_file.name()).copied(),
                            Some(new_file),
                        ));
                    }
                }
            }

            if !file_changes.is_empty() {
                renderer.block("files");
                for (old_file, new_file) in file_changes.iter() {
                    renderer.changed_file(*old_file, *new_file);
                }
                renderer.unindent();
            } else if old.files != new.files {
                renderer.block("files");
                println!("    {}", "Order changed".cyan());
                renderer.unindent();
            }

            renderer.unindent();
            println!();
        }
    }
    for item in difference {
        if let ChallengeUpdateIntermediate::DeleteChallenge { stable_id } = item {
            println!("{}", "Delete challenge:".red());
            renderer.indent();
            renderer.attribute("stable_id", stable_id.as_str());
            renderer.unindent();
            println!();
        }
    }
}

struct DiffRenderer {
    indent: usize,
    list_item: Option<ColoredString>,
}

impl DiffRenderer {
    fn new() -> Self {
        Self {
            indent: 0,
            list_item: None,
        }
    }

    fn indent(&mut self) {
        self.indent += 2;
    }

    fn unindent(&mut self) {
        self.indent -= 2;
    }

    fn print_indent(&mut self) {
        if let Some(s) = &self.list_item {
            print!("{:indent$}{} ", "", s, indent = self.indent - 2);
            self.list_item = None;
        } else {
            print!("{:indent$}", "", indent = self.indent);
        }
    }

    fn block(&mut self, name: &str) {
        self.print_indent();
        println!("{name}:");
        self.indent();
    }

    fn attribute(&mut self, name: &str, value: impl Into<Value>) {
        self.print_indent();
        print!("{name}: ");
        self.value(&value.into());
        println!();
    }

    fn attribute_comment(&mut self, name: &str, comment: &str) {
        self.print_indent();
        print!("{}: {}", name, comment.cyan());
        println!();
    }

    fn attribute_changed_comment(
        &mut self,
        name: &str,
        old_value: impl Into<Value>,
        comment: &str,
    ) {
        self.print_indent();
        print!("{name}: ");
        self.value(&old_value.into());
        println!(" -> {}", comment.cyan());
    }

    fn attribute_changed(
        &mut self,
        name: &str,
        old_value: impl Into<Value>,
        new_value: impl Into<Value>,
    ) {
        self.print_indent();
        print!("{name}: ");
        self.value(&old_value.into());
        print!(" -> ");
        self.value(&new_value.into());
        println!();
    }

    fn attribute_if_changed(
        &mut self,
        name: &str,
        old_value: impl Into<Value>,
        new_value: impl Into<Value>,
    ) {
        let old_value = old_value.into();
        let new_value = new_value.into();
        if old_value != new_value {
            self.attribute_changed(name, old_value, new_value);
        }
    }

    fn attribute_always(
        &mut self,
        name: &str,
        old_value: impl Into<Value>,
        new_value: impl Into<Value>,
    ) {
        let old_value = old_value.into();
        let new_value = new_value.into();
        if old_value != new_value {
            self.attribute_changed(name, old_value, new_value);
        } else {
            self.attribute(name, new_value);
        }
    }

    fn list_item(&mut self, s: ColoredString) {
        self.list_item = Some(s);
    }

    fn file(&mut self, file: &AttachmentIntermediate) {
        self.list_item("+".green());
        match file {
            AttachmentIntermediate::Literal(attachment) => {
                self.attribute("name", attachment.name.as_str());
                self.attribute("url", attachment.url.as_str());
                self.attribute("hash", attachment.hash.as_deref());
            }
            AttachmentIntermediate::Upload(upload) => {
                self.attribute("name", upload.name.as_str());
                self.attribute_comment("url", &format!("Upload {}", upload.path.display()));
                self.attribute("hash", upload.hash.as_str());
            }
        }
    }

    fn changed_file(
        &mut self,
        old_file: Option<&AttachmentIntermediate>,
        new_file: Option<&AttachmentIntermediate>,
    ) {
        if old_file == new_file {
            return;
        }
        match (old_file, new_file) {
            (None, None) => unreachable!(),
            (None, Some(new_file)) => {
                self.file(new_file);
            }
            (Some(old_file), None) => {
                self.list_item("✗".red());
                match old_file {
                    AttachmentIntermediate::Literal(attachment) => {
                        self.attribute("name", attachment.name.as_str());
                        self.attribute("url", attachment.url.as_str());
                        self.attribute("hash", attachment.hash.as_deref());
                    }
                    _ => unreachable!(),
                }
            }
            (Some(old_file), Some(new_file)) => {
                let AttachmentIntermediate::Literal(old_attachment) = old_file else {
                    unreachable!();
                };
                self.list_item("~".yellow());
                match new_file {
                    AttachmentIntermediate::Literal(new_attachment) => {
                        self.attribute_always(
                            "name",
                            old_attachment.name.as_str(),
                            new_attachment.name.as_str(),
                        );
                        self.attribute_always(
                            "url",
                            old_attachment.url.as_str(),
                            new_attachment.url.as_str(),
                        );
                        self.attribute_always(
                            "hash",
                            old_attachment.hash.as_deref(),
                            new_attachment.hash.as_deref(),
                        );
                    }
                    AttachmentIntermediate::Upload(upload) => {
                        self.attribute_always(
                            "name",
                            old_attachment.name.as_str(),
                            upload.name.as_str(),
                        );
                        self.attribute_changed_comment(
                            "url",
                            old_attachment.url.as_str(),
                            &format!("Upload {}", upload.path.display()),
                        );
                        self.attribute_always(
                            "hash",
                            old_attachment.hash.as_deref(),
                            upload.hash.as_str(),
                        );
                    }
                }
            }
        }
    }

    #[allow(clippy::only_used_in_recursion)]
    fn value(&self, value: &Value) {
        match value {
            Value::Null => print!("{}", "null".blue()),
            Value::Bool(b) => print!("{}", b.to_string().blue()),
            Value::Number(n) => print!("{}", n.to_string().blue()),
            Value::String(s) => print!("{}", serde_json::to_string(s).unwrap().green()),
            Value::Array(values) => {
                print!("[");
                for (i, val) in values.iter().enumerate() {
                    self.value(val);
                    if i < values.len() - 1 {
                        print!(", ");
                    }
                }
                print!("]");
            }
            Value::Object(map) => {
                print!("{{");
                for (i, (k, v)) in map.iter().enumerate() {
                    print!("{}: ", serde_json::to_string(k).unwrap().green());
                    self.value(v);
                    if i < map.len() - 1 {
                        print!(", ");
                    }
                }
                print!("}}");
            }
        }
    }
}
