fn main() {
    // trigger recompilation when a new migration is added
    println!("cargo:rerun-if-changed=fonts");
    println!("cargo:rerun-if-changed=locales");
    println!("cargo:rerun-if-changed=migrations");
    println!("cargo:rerun-if-changed=static");

    minijinja_embed::embed_templates!("templates");
}
