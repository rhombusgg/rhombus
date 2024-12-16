use std::{net::IpAddr, num::NonZeroU64, sync::LazyLock, time::Duration};

use axum::{
    extract::{Query, State},
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
    auth::User,
    database::{
        cache::TimedCache,
        provider::{Email, SetAccountNameError},
    },
    router::RouterState,
    routes::meta::PageMeta,
    templates::{toast_header, ToastKind},
};

pub fn generate_email_callback_code() -> String {
    Alphanumeric.sample_string(&mut thread_rng(), 16)
}

pub static IS_IN_SERVER_CACHE: LazyLock<DashMap<NonZeroU64, TimedCache<bool>>> =
    LazyLock::new(DashMap::new);

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

pub async fn route_account(
    state: State<RouterState>,
    Extension(user): Extension<User>,
    Extension(page): Extension<PageMeta>,
) -> impl IntoResponse {
    struct DiscordSettings {
        guild_id: NonZeroU64,
        bot_token: String,
    }

    let discord = state
        .settings
        .read()
        .await
        .discord
        .as_ref()
        .map(|d| DiscordSettings {
            guild_id: d.guild_id,
            bot_token: d.bot_token.clone(),
        });

    #[derive(Serialize)]
    struct DiscordData {
        in_server: bool,
        invite_url: Option<String>,
    }

    let discord = if let Some(discord) = discord {
        let in_server = if let Some(user_discord_id) = user.discord_id {
            is_in_server(discord.guild_id, user_discord_id, &discord.bot_token).await
        } else {
            false
        };

        let invite_url = if !in_server {
            let invite_url = state.bot.as_ref().unwrap().get_invite_url().await;
            if let Err(ref err) = invite_url {
                tracing::error!("Failed to get invite URL: {:?}", err);
            }
            invite_url.ok()
        } else {
            None
        };

        Some(DiscordData {
            in_server,
            invite_url,
        })
    } else {
        None
    };

    let challenge_data = state.db.get_challenges();
    let team = state.db.get_team_from_id(user.team_id);
    let emails = state.db.get_emails_for_user_id(user.id);
    let (challenge_data, team, emails) = tokio::join!(challenge_data, team, emails);
    let (challenge_data, team, emails) = (challenge_data.unwrap(), team.unwrap(), emails.unwrap());

    Html(
        state
            .jinja
            .get_template("account/account.html")
            .unwrap()
            .render(context! {
                global => state.global_page_meta,
                page,
                title => format!("Account | {}", state.global_page_meta.title),
                og_image => format!("{}/user/{}/og-image.png", state.global_page_meta.location_url, user.id),
                user,
                discord,
                now => chrono::Utc::now(),
                team,
                challenges => challenge_data.challenges,
                categories => challenge_data.categories,
                emails,
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
    Extension(page): Extension<PageMeta>,
    Form(form): Form<EmailSubmit>,
) -> impl IntoResponse {
    if form.email.is_empty() || form.email.len() > 255 {
        return Response::builder()
            .status(StatusCode::BAD_REQUEST)
            .header(
                "HX-Trigger",
                toast_header(
                    ToastKind::Error,
                    &state
                        .localizer
                        .localize(&page.lang, "account-error-email-length", None)
                        .unwrap(),
                ),
            )
            .body("".to_owned())
            .unwrap();
    }

    let mut emails = state.db.get_emails_for_user_id(user.id).await.unwrap();
    if emails.iter().any(|email| email.address == form.email) {
        return Response::builder()
            .status(StatusCode::BAD_REQUEST)
            .header(
                "HX-Trigger",
                toast_header(
                    ToastKind::Error,
                    &state
                        .localizer
                        .localize(&page.lang, "account-error-email-already-added", None)
                        .unwrap(),
                ),
            )
            .body("".to_owned())
            .unwrap();
    }

    if let Some(ref mailer) = state.outbound_mailer {
        let Ok(code) = state
            .db
            .create_email_verification_callback_code(user.id, &form.email)
            .await
        else {
            return Response::builder()
                .status(StatusCode::BAD_REQUEST)
                .header(
                    "HX-Trigger",
                    toast_header(
                        ToastKind::Error,
                        &state
                            .localizer
                            .localize(&page.lang, "account-error-verification-email", None)
                            .unwrap(),
                    ),
                )
                .body("".to_owned())
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
                .status(StatusCode::BAD_REQUEST)
                .header(
                    "HX-Trigger",
                    toast_header(
                        ToastKind::Error,
                        &state
                            .localizer
                            .localize(&page.lang, "account-error-verification-email", None)
                            .unwrap(),
                    ),
                )
                .body("".to_owned())
                .unwrap();
        }

        tracing::trace!(
            user_id = user.id,
            email = form.email,
            "Sent verification email"
        );
    }

    emails.push(Email {
        address: form.email,
        verified: false,
    });

    Response::builder()
        .header(
            "HX-Trigger",
            toast_header(
                ToastKind::Success,
                &state
                    .localizer
                    .localize(&page.lang, "account-check-email", None)
                    .unwrap(),
            ),
        )
        .body(
            state
                .jinja
                .get_template("account/account-emails.html")
                .unwrap()
                .render(context! {
                    page,
                    emails,
                    oob => true,
                })
                .unwrap(),
        )
        .unwrap()
}

#[derive(Deserialize)]
pub struct EmailVerifyParams {
    code: String,
}

pub async fn route_account_email_verify_callback(
    state: State<RouterState>,
    Extension(user): Extension<User>,
    Extension(page): Extension<PageMeta>,
    params: Query<EmailVerifyParams>,
) -> impl IntoResponse {
    let Ok(email) = state
        .db
        .get_email_verification_by_callback_code(&params.code)
        .await
    else {
        tracing::info!(
            code = params.code,
            "invalid email verification callback code"
        );
        return Redirect::temporary("/account").into_response();
    };

    Html(
        state
            .jinja
            .get_template("account/email-verify.html")
            .unwrap()
            .render(context! {
                global => state.global_page_meta,
                title => format!("Verify Email | {}", state.global_page_meta.title),
                page,
                user,
                email,
                code => params.code,
            })
            .unwrap(),
    )
    .into_response()
}

pub async fn route_account_email_verify_confirm(
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
    Extension(page): Extension<PageMeta>,
    Query(query): Query<EmailRemove>,
) -> impl IntoResponse {
    let mut emails = state.db.get_emails_for_user_id(user.id).await.unwrap();

    if emails.len() == 1 {
        return Response::builder()
            .status(StatusCode::BAD_REQUEST)
            .body("".to_owned())
            .unwrap();
    }

    state.db.delete_email(user.id, &query.email).await.unwrap();

    emails.retain(|email| email.address != query.email);

    Response::builder()
        .body(
            state
                .jinja
                .get_template("account/account-emails.html")
                .unwrap()
                .render(context! {
                    page,
                    emails,
                    oob => true,
                })
                .unwrap(),
        )
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
    Extension(page): Extension<PageMeta>,
    Form(form): Form<SetAccountName>,
) -> Result<impl IntoResponse, StatusCode> {
    if user.disabled {
        return Err(StatusCode::FORBIDDEN);
    }

    let mut errors = vec![];
    let graphemes = form.name.graphemes(true).count();
    if !(3..=30).contains(&graphemes) || !(0..=256).contains(&form.name.len()) {
        errors.push(
            state
                .localizer
                .localize(&page.lang, "account-error-name-length", None),
        );
    } else if let Err(e) = state
        .db
        .set_account_name(user.id, user.team_id, &form.name, 60 * 30)
        .await
        .unwrap()
    {
        match e {
            SetAccountNameError::Taken => {
                errors.push(
                    state
                        .localizer
                        .localize(&page.lang, "account-error-name-taken", None),
                );
            }
            SetAccountNameError::Timeout(resets_at) => {
                let resets_in = resets_at - chrono::Utc::now();
                errors.push(Some(format!(
                    "You can change name again in {} minutes",
                    resets_in.num_minutes() + 1
                )));
            }
        }
    }

    let account_name_template = state
        .jinja
        .get_template("account/account-set-name.html")
        .unwrap();

    if errors.is_empty() {
        let html = account_name_template
            .render(context! {
                page,
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
                page,
                errors,
            })
            .unwrap();
        Ok(Response::builder()
            .header("Content-Type", "text/html")
            .body(html)
            .unwrap())
    }
}
