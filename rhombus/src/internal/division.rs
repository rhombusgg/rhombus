use std::{num::NonZeroU32, sync::Arc};

use async_trait::async_trait;
use fancy_regex::Regex;
use serde::Serialize;

use crate::internal::database::provider::Connection;

pub type DivisionEligibilityProvider = Arc<dyn DivisionEligible + Send + Sync>;

#[async_trait]
pub trait DivisionEligible {
    async fn is_user_eligible(&self, user_id: i64) -> std::result::Result<bool, String>;
}

pub struct EmailDivisionEligibilityProvider {
    pub db: Connection,
    pub regex: Regex,
    pub requirement: String,
}

impl EmailDivisionEligibilityProvider {
    pub fn new(db: Connection, regex: &str, requirement: Option<String>) -> Self {
        let r = Regex::new(regex).unwrap();
        Self {
            db,
            regex: r,
            requirement: requirement.unwrap_or(format!("Email must match regex {regex}")),
        }
    }
}

#[async_trait]
impl DivisionEligible for EmailDivisionEligibilityProvider {
    async fn is_user_eligible(&self, user_id: i64) -> std::result::Result<bool, String> {
        let emails = self.db.get_emails_for_user_id(user_id).await.unwrap();
        let eligible = emails
            .iter()
            .filter(|email| email.verified)
            .any(|email| self.regex.is_match(&email.address).unwrap());

        if eligible {
            Ok(true)
        } else {
            Err(self.requirement.clone())
        }
    }
}

pub struct OpenDivisionEligibilityProvider;

#[async_trait]
impl DivisionEligible for OpenDivisionEligibilityProvider {
    async fn is_user_eligible(&self, _user_id: i64) -> std::result::Result<bool, String> {
        Ok(true)
    }
}

#[derive(Serialize, Clone)]
pub struct Division {
    pub id: i64,
    pub name: String,
    pub description: String,
    pub max_players: MaxDivisionPlayers,
    pub is_default: bool,

    #[serde(skip)]
    pub division_eligibility: DivisionEligibilityProvider,
}

#[derive(Debug, Serialize, Clone)]
pub enum MaxDivisionPlayers {
    Unlimited,
    Limited(NonZeroU32),
}
