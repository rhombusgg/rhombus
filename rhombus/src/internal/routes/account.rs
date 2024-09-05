use std::{collections::BTreeMap, net::IpAddr, num::NonZeroU64, time::Duration};

use axum::{
    extract::{Query, State},
    http::Uri,
    response::{Html, IntoResponse, Redirect, Response},
    Extension, Form,
};
use dashmap::DashMap;
use minijinja::context;
use rand::{
    distributions::{Alphanumeric, DistString},
    thread_rng,
};
use reqwest::{Client, StatusCode};
use serde::{Deserialize, Serialize};
use unicode_segmentation::UnicodeSegmentation;

use crate::internal::{
    auth::User, database::cache::TimedCache, locales::Languages, router::RouterState,
};

pub fn generate_email_callback_code() -> String {
    Alphanumeric.sample_string(&mut thread_rng(), 16)
}

lazy_static::lazy_static! {
    pub static ref IS_IN_SERVER_CACHE: DashMap<NonZeroU64, TimedCache<bool>> = DashMap::new();
}

async fn is_in_server(
    discord_guild_id: NonZeroU64,
    discord_id: NonZeroU64,
    discord_bot_token: &str,
) -> bool {
    if let Some(team) = IS_IN_SERVER_CACHE.get(&discord_id) {
        return team.value;
    }
    tracing::trace!(discord_id, "cache miss: is_in_server");

    let client = Client::new();
    let res = client
        .get(format!(
            "https://discord.com/api/guilds/{}/members/{}",
            discord_guild_id, discord_id
        ))
        .header("Authorization", format!("Bot {}", discord_bot_token))
        .send()
        .await
        .unwrap();

    let is_in = res.status().is_success();
    IS_IN_SERVER_CACHE.insert(discord_id.to_owned(), TimedCache::new(is_in));
    is_in
}

#[derive(Serialize)]
pub struct UserDivision<'a> {
    pub id: i64,
    pub name: &'a str,
    pub description: &'a str,
    pub eligible: bool,
    pub requirement: Option<String>,
}

pub async fn route_account(
    state: State<RouterState>,
    Extension(user): Extension<User>,
    Extension(lang): Extension<Languages>,
    uri: Uri,
) -> impl IntoResponse {
    struct DiscordSettings {
        guild_id: NonZeroU64,
        bot_token: String,
    }

    let (discord, location_url, title) = {
        let settings = state.settings.read().await;
        (
            settings.discord.as_ref().map(|d| DiscordSettings {
                guild_id: d.guild_id,
                bot_token: d.bot_token.clone(),
            }),
            settings.location_url.clone(),
            settings.title.clone(),
        )
    };

    #[derive(Serialize)]
    struct DiscordData {
        in_server: bool,
        invite_url: String,
    }

    let discord = if let Some(discord) = discord {
        let in_server = if let Some(user_discord_id) = user.discord_id {
            is_in_server(discord.guild_id, user_discord_id, &discord.bot_token).await
        } else {
            false
        };

        Some(DiscordData {
            in_server,
            invite_url: state.bot.as_ref().unwrap().get_invite_url().await.unwrap(),
        })
    } else {
        None
    };

    let challenge_data = state.db.get_challenges();
    let team = state.db.get_team_from_id(user.team_id);
    let emails = state.db.get_emails_for_user_id(user.id);
    let user_divisions = state.db.get_user_divisions(user.id);
    let (challenge_data, team, emails, user_divisions) =
        tokio::join!(challenge_data, team, emails, user_divisions);
    let (challenge_data, team, emails, user_divisions) = (
        challenge_data.unwrap(),
        team.unwrap(),
        emails.unwrap(),
        user_divisions.unwrap(),
    );

    let mut divisions = vec![];
    for division in state.divisions.iter() {
        let eligible = division
            .division_eligibility
            .is_user_eligible(user.id)
            .await;

        let joined = user_divisions.contains(&division.id);

        if eligible.is_ok() != joined {
            state
                .db
                .set_user_division(user.id, team.id, division.id, eligible.is_ok())
                .await
                .unwrap();
        }

        divisions.push(UserDivision {
            id: division.id,
            name: &division.name,
            description: &division.description,
            eligible: eligible.is_ok(),
            requirement: eligible.err(),
        })
    }

    let mut challenges = BTreeMap::new();
    for challenge in &challenge_data.challenges {
        challenges.insert(challenge.id, challenge);
    }

    let mut categories = BTreeMap::new();
    for category in &challenge_data.categories {
        categories.insert(category.id, category);
    }

    Html(
        state
            .jinja
            .get_template("account.html")
            .unwrap()
            .render(context! {
                lang,
                user,
                title,
                uri => uri.to_string(),
                discord,
                og_image => format!("{}/og-image.png", location_url),
                now => chrono::Utc::now(),
                team,
                challenges,
                categories,
                emails,
                divisions,
            })
            .unwrap(),
    )
}

#[derive(Deserialize)]
pub struct EmailSubmit {
    email: String,
}

pub async fn route_account_add_email(
    state: State<RouterState>,
    Extension(user): Extension<User>,
    Extension(ip): Extension<Option<IpAddr>>,
    Extension(lang): Extension<Languages>,
    Form(form): Form<EmailSubmit>,
) -> impl IntoResponse {
    if form.email.is_empty() || form.email.len() > 255 {
        return Response::builder()
            .body(format!(
                r#"<div id="htmx-toaster" data-toast="error" hx-swap-oob="true">{}</div>"#,
                state
                    .localizer
                    .localize(&lang, "account-error-email-length", None)
                    .unwrap(),
            ))
            .unwrap();
    }

    let emails = state.db.get_emails_for_user_id(user.id).await.unwrap();
    if emails.iter().any(|email| email.address == form.email) {
        return Response::builder()
            .body(format!(
                r#"<div id="htmx-toaster" data-toast="error" hx-swap-oob="true">{}</div>"#,
                state
                    .localizer
                    .localize(&lang, "account-error-email-already-added", None)
                    .unwrap(),
            ))
            .unwrap();
    }

    if let Some(ref mailer) = state.outbound_mailer {
        let Ok(code) = state
            .db
            .create_email_verification_callback_code(user.id, &form.email)
            .await
        else {
            return Response::builder()
                .body(format!(
                    r#"<div id="htmx-toaster" data-toast="error" hx-swap-oob="true">{}</div>"#,
                    state
                        .localizer
                        .localize(&lang, "account-error-verification-email", None)
                        .unwrap(),
                ))
                .unwrap();
        };

        if mailer
            .send_email_confirmation(
                &user.name,
                ip.map(|ip| ip.to_string()).as_deref(),
                &form.email,
                &code,
            )
            .await
            .is_err()
        {
            state.db.delete_email(user.id, &form.email).await.unwrap();

            return Response::builder()
                .body(format!(
                    r#"<div id="htmx-toaster" data-toast="error" hx-swap-oob="true">{}</div>"#,
                    state
                        .localizer
                        .localize(&lang, "account-error-verification-email", None)
                        .unwrap(),
                ))
                .unwrap();
        }

        tracing::trace!(
            user_id = user.id,
            email = form.email,
            "Sent verification email"
        );
    }

    Response::builder()
        .body(format!(
            r#"<div id="htmx-toaster" data-toast="success" hx-swap-oob="true">{}</div>"#,
            state
                .localizer
                .localize(&lang, "account-check-email", None)
                .unwrap(),
        ))
        .unwrap()
}

#[derive(Deserialize)]
pub struct EmailVerifyParams {
    code: String,
}

pub async fn route_account_email_verify_callback(
    state: State<RouterState>,
    params: Query<EmailVerifyParams>,
) -> impl IntoResponse {
    state
        .db
        .verify_email_verification_callback_code(&params.code)
        .await
        .unwrap();

    Redirect::to("/account")
}

#[derive(Deserialize)]
pub struct EmailRemove {
    email: String,
}

pub async fn route_account_delete_email(
    state: State<RouterState>,
    Extension(user): Extension<User>,
    Form(form): Form<EmailRemove>,
) -> impl IntoResponse {
    let emails = state.db.get_emails_for_user_id(user.id).await.unwrap();

    if emails.len() == 1 {
        return Response::builder()
            .status(StatusCode::BAD_REQUEST)
            .body("".to_owned())
            .unwrap();
    }

    state.db.delete_email(user.id, &form.email).await.unwrap();

    Response::builder()
        .header("HX-Trigger", "pageRefresh")
        .body("".to_owned())
        .unwrap()
}

pub fn discord_cache_evictor() {
    tokio::task::spawn(async {
        let interval = Duration::from_secs(10);
        loop {
            tokio::time::sleep(interval).await;
            // tracing::trace!("Evicting discord id cache");
            let evict_threshold = (chrono::Utc::now() - interval).timestamp();
            IS_IN_SERVER_CACHE.retain(|_, v| v.insert_timestamp > evict_threshold);
        }
    });
}

#[derive(Deserialize)]
pub struct SetAccountName {
    name: String,
}

pub async fn route_account_set_name(
    state: State<RouterState>,
    Extension(user): Extension<User>,
    Extension(lang): Extension<Languages>,
    Form(form): Form<SetAccountName>,
) -> Result<impl IntoResponse, StatusCode> {
    let mut errors = vec![];
    let graphemes = form.name.graphemes(true).count();
    if !(3..=30).contains(&graphemes) {
        errors.push(
            state
                .localizer
                .localize(&lang, "account-error-name-length", None),
        );
    } else if state
        .db
        .set_account_name(user.id, user.team_id, &form.name)
        .await
        .is_err()
    {
        errors.push(
            state
                .localizer
                .localize(&lang, "account-error-name-taken", None),
        );
    }

    let account_name_template = state.jinja.get_template("account-set-name.html").unwrap();

    if errors.is_empty() {
        let html = account_name_template
            .render(context! {
                lang => lang,
                new_account_name => &form.name,
            })
            .unwrap();

        Ok(Response::builder()
            .header("Content-Type", "text/html")
            .body(html)
            .unwrap())
    } else {
        let html = account_name_template
            .render(context! {
                lang => lang,
                errors => errors,
            })
            .unwrap();
        Ok(Response::builder()
            .header("Content-Type", "text/html")
            .body(html)
            .unwrap())
    }
}
