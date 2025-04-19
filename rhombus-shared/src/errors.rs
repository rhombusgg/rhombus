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
}
