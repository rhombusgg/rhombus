use thiserror::Error;

pub type Result<T> = std::result::Result<T, RhombusSharedError>;

#[derive(Error, Debug)]
pub enum RhombusSharedError {
    #[error("{0}")]
    Figment(#[from] figment::Error),

    #[error("Failed to convert markdown: {0}")]
    Markdown(markdown::message::Message),

    #[error("IO error: {0}")]
    IO(#[from] std::io::Error),

    #[error("YAML error: {0}")]
    Yaml(#[from] serde_yml::Error),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Category {0} not found for challenge {1}")]
    CategoryNotFound(String, String),

    #[error("Author {0} not found for challenge {1}")]
    AuthorNotFound(String, String),
}
