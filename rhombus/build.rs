fn main() {
    // trigger recompilation when a new migration is added
    println!("cargo:rerun-if-changed=migrations");

    minijinja_embed::embed_templates!("templates");
}
