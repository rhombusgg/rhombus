use anyhow::{anyhow, Context, Result};
use figment::{
    providers::{Format, Yaml},
    Figment,
};
use serde::{Deserialize, Serialize};
use std::{collections::BTreeMap, path::PathBuf};

#[derive(Serialize, Deserialize)]
pub struct ProjectConfigYaml {
    pub url: String,
}

pub struct ProjectConfig {
    pub path: PathBuf,
    pub url: String,
}

impl From<ProjectConfig> for ProjectConfigYaml {
    fn from(val: ProjectConfig) -> Self {
        ProjectConfigYaml { url: val.url }
    }
}

#[derive(Serialize, Deserialize)]
pub struct SecretConfigYaml {
    pub keys: Vec<UrlKeyPairYaml>,
}

#[derive(Serialize, Deserialize)]
pub struct UrlKeyPairYaml {
    pub url: String,
    pub key: String,
}

pub struct SecretConfig {
    pub path: PathBuf,
    pub keys: BTreeMap<String, String>,
}

impl From<SecretConfig> for SecretConfigYaml {
    fn from(val: SecretConfig) -> Self {
        SecretConfigYaml {
            keys: val
                .keys
                .into_iter()
                .map(|(url, key)| UrlKeyPairYaml { url, key })
                .collect(),
        }
    }
}

pub fn find_project_config_file() -> Result<PathBuf> {
    for path in std::env::current_dir()?.ancestors() {
        if path.join("rhombus-cli.yaml").is_file() {
            return Ok(path.join("rhombus-cli.yaml").to_owned());
        }
    }
    Err(anyhow!(
        "failed to find rhombus-cli.yaml. Run rhombus-cli auth"
    ))
}

pub fn read_project_config() -> Result<ProjectConfig> {
    let path = find_project_config_file()?;
    let config: ProjectConfigYaml = Figment::new()
        .merge(Yaml::file_exact(&path))
        .extract()
        .with_context(|| format!("failed to load project config file ({})", path.display()))?;
    Ok(ProjectConfig {
        url: config.url,
        path,
    })
}

pub fn find_secret_config_file() -> Result<PathBuf> {
    Ok(
        directories::ProjectDirs::from("gg", "rhombus", "rhombus-cli")
            .ok_or(anyhow!("failed to find config directory"))?
            .config_dir()
            .join("config.yaml")
            .to_owned(),
    )
}

pub fn read_secret_config() -> Result<SecretConfig> {
    let path = find_secret_config_file()?;
    if !path.exists() {
        return Ok(SecretConfig {
            path,
            keys: BTreeMap::new(),
        });
    }
    let config: SecretConfigYaml = Figment::new()
        .merge(Yaml::file_exact(&path))
        .extract()
        .with_context(|| format!("failed to load config file ({})", path.display()))?;

    Ok(SecretConfig {
        keys: config
            .keys
            .into_iter()
            .map(|pair| (pair.url, pair.key))
            .collect(),
        path,
    })
}
