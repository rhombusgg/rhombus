use std::time::Duration;

use chrono::{TimeZone, Utc};

use crate::internal::database::provider::{Connection, WeakConnection};

pub async fn healthcheck_catch_up(db: Connection) {
    tracing::info!("Running healthcheck catch-up");
    let challenges = db.get_challenges().await.unwrap();

    for challenge in &challenges.challenges {
        if challenge.healthscript.is_none() {
            continue;
        }

        if challenge.healthy.is_some() {
            continue;
        }

        let (expr, _) = healthscript::parse(challenge.healthscript.as_ref().unwrap());
        let healthy = if let Some(expr) = expr {
            Some(expr.execute().await.0)
        } else {
            tracing::error!(challenge_id = challenge.id, "Failed to parse healthscript");
            None
        };

        _ = db
            .set_challenge_health(challenge.id, healthy, chrono::Utc::now())
            .await;

        tracing::trace!(challenge_id = challenge.id, challenge_name = challenge.name, healthy = ?healthy, "Healthcheck catch-up");
    }
}

pub fn healthcheck_runner(db: WeakConnection) {
    tokio::task::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_secs(60)).await;

            let Some(db) = db.upgrade() else {
                break;
            };
            let challenges = db.get_challenges().await.unwrap();

            if let Some(challenge) = challenges
                .challenges
                .iter()
                .filter(|challenge| challenge.healthscript.is_some())
                .min_by_key(|challenge| {
                    challenge
                        .last_healthcheck
                        .unwrap_or(Utc.timestamp_opt(0, 0).unwrap())
                })
            {
                let (expr, _) = healthscript::parse(challenge.healthscript.as_ref().unwrap());
                let healthy = if let Some(expr) = expr {
                    Some(expr.execute().await.0)
                } else {
                    tracing::error!(challenge_id = challenge.id, "Failed to parse healthscript");
                    None
                };

                _ = db
                    .set_challenge_health(challenge.id, healthy, chrono::Utc::now())
                    .await;

                tracing::trace!(challenge_id = challenge.id, challenge_name = challenge.name, healthy = ?healthy, "Healthcheck");
            }
        }
    });
}
