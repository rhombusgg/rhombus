use std::{num::NonZeroU32, sync::Arc};

use async_trait::async_trait;
use fancy_regex::Regex;
use serde::Serialize;
use tokio::sync::MutexGuard;

use crate::internal::database::provider::Connection;

use super::database::provider::Database;

pub type DivisionEligibilityProvider = Arc<dyn DivisionEligible + Send + Sync>;

#[async_trait]
pub trait DivisionEligible {
    async fn is_user_eligible(
        &self,
        user_id: i64,
        db: &Arc<dyn Database + Send + Sync>,
    ) -> std::result::Result<bool, String>;
}

pub struct EmailDivisionEligibilityProvider {
    pub regex: Regex,
    pub requirement: String,
}

impl EmailDivisionEligibilityProvider {
    pub fn new(regex: &str, requirement: Option<String>) -> Self {
        let r = Regex::new(regex).unwrap();
        Self {
            regex: r,
            requirement: requirement.unwrap_or(format!("Email must match regex {regex}")),
        }
    }
}

#[async_trait]
impl DivisionEligible for EmailDivisionEligibilityProvider {
    async fn is_user_eligible(
        &self,
        user_id: i64,
        db: &Arc<dyn Database + Send + Sync>,
    ) -> std::result::Result<bool, String> {
        let emails = db.get_emails_for_user_id(user_id).await.unwrap();
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
    async fn is_user_eligible(
        &self,
        _user_id: i64,
        _db: &Arc<dyn Database + Send + Sync>,
    ) -> std::result::Result<bool, String> {
        Ok(true)
    }
}

#[derive(Serialize, Clone)]
pub struct Division {
    pub id: i64,
    pub name: String,
    pub description: String,
    pub max_players: MaxDivisionPlayers,

    #[serde(skip)]
    pub division_eligibility: DivisionEligibilityProvider,
}

#[derive(Debug, Serialize, Clone)]
pub enum MaxDivisionPlayers {
    Unlimited,
    Limited(NonZeroU32),
}
