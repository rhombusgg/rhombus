use std::sync::Arc;

use async_trait::async_trait;
use axum::{
    body::{Body, Bytes},
    extract::{FromRequest, Multipart, State},
    http::{HeaderMap, Request, Response},
    response::IntoResponse,
    routing::post,
    Form, Router,
};
use ring::hmac;
use serde::Deserialize;
use serde_json::json;
use tokio::sync::RwLock;

use crate::{
    errors::Result,
    internal::{
        discord::DiscordAttachment,
        email::provider::{InboundEmail, OutboundEmailProvider},
        local_upload_provider::slice_to_hex_string,
        router::RouterState,
        settings::Settings,
    },
};

pub struct MailgunProvider {
    pub settings: Arc<RwLock<Settings>>,
}

pub fn mailgun_error(error: &str) -> Response<Body> {
    Response::builder()
        .status(406)
        .header("Content-Type", "application/json")
        .body(Body::from(json!({ "error": error }).to_string()))
        .unwrap()
}

pub async fn route_mailgun_receive_email(
    state: State<RouterState>,
    headers: HeaderMap,
    req: Request<Body>,
) -> impl IntoResponse {
    tracing::info!("recieving mailgun");

    let Some(ref bot) = state.bot else {
        return mailgun_error("Discord bot not configured");
    };

    let Some(content_type) = headers.get("content-type") else {
        return mailgun_error("Content-Type not found");
    };

    let (main_message, in_reply_to, from, attachments, timestamp, token, signature) =
        match content_type.as_bytes() {
            b"application/x-www-form-urlencoded" => {
                let Ok(form) = Form::<MailgunForm>::from_request(req, &()).await else {
                    return mailgun_error("Failed to parse form");
                };

                (
                    form.stripped_text.clone(),
                    form.in_reply_to.clone(),
                    form.from.clone(),
                    vec![],
                    form.timestamp,
                    form.token.clone(),
                    form.signature.clone(),
                )
            }
            b if b.starts_with(b"multipart/form-data") => {
                let mut multipart = Multipart::from_request(req, &()).await.unwrap();

                struct Attachment {
                    filename: String,
                    data: Bytes,
                }

                let mut attachments = vec![];
                let mut in_reply_to = None;
                let mut main_message = None;
                let mut from = None;
                let mut timestamp = None;
                let mut token = None;
                let mut signature = None;
                while let Some(field) = multipart.next_field().await.unwrap() {
                    if let Some(file_name) = field.file_name() {
                        attachments.push(Attachment {
                            filename: file_name.to_owned(),
                            data: field.bytes().await.unwrap(),
                        })
                    } else if let Some(name) = field.name() {
                        match name {
                            "In-Reply-To" => in_reply_to = Some(field.text().await.unwrap()),
                            "stripped-text" => main_message = Some(field.text().await.unwrap()),
                            "From" => from = Some(field.text().await.unwrap()),
                            "timestamp" => timestamp = Some(field.text().await.unwrap()),
                            "token" => token = Some(field.text().await.unwrap()),
                            "signature" => signature = Some(field.text().await.unwrap()),
                            _ => (),
                        }
                    }
                }

                let Some(in_reply_to) = in_reply_to else {
                    return mailgun_error("In-Reply-To not found");
                };

                let Some(main_message) = main_message else {
                    return mailgun_error("stripped-text not found");
                };

                let Some(timestamp) = timestamp else {
                    return mailgun_error("timestamp not found");
                };

                let Ok(timestamp) = timestamp.parse::<u64>() else {
                    return mailgun_error("Invalid timestamp");
                };

                let Some(token) = token else {
                    return mailgun_error("token not found");
                };

                let Some(signature) = signature else {
                    return mailgun_error("signature not found");
                };

                (
                    main_message,
                    in_reply_to,
                    from,
                    attachments,
                    timestamp,
                    token,
                    signature,
                )
            }
            _ => {
                return mailgun_error("Invalid Content-Type");
            }
        };

    let webhook_signing_key = {
        let settings = state.settings.read().await;
        settings
            .email
            .as_ref()
            .unwrap()
            .mailgun
            .as_ref()
            .unwrap()
            .webhook_signing_key
            .clone()
    };

    let tag = hmac::sign(
        &hmac::Key::new(hmac::HMAC_SHA256, webhook_signing_key.as_bytes()),
        format!("{timestamp}{token}").as_bytes(),
    );
    let tag_signature = slice_to_hex_string(tag.as_ref());

    if tag_signature != signature {
        return mailgun_error("Invalid signature");
    }

    let Ok(Some(ticket_number)) = state.db.get_ticket_number_by_message_id(&in_reply_to).await
    else {
        tracing::error!(in_reply_to, "Failed to find ticket number");
        return mailgun_error("Internal error");
    };

    let Ok(ticket) = state.db.get_ticket_by_ticket_number(ticket_number).await else {
        tracing::error!(ticket_number, "Failed to find ticket");
        return mailgun_error("Internal error");
    };

    let Ok(user) = state.db.get_user_from_id(ticket.user_id).await else {
        tracing::error!(ticket.user_id, "Failed to find user");
        return mailgun_error("Internal error");
    };

    if bot
        .send_external_ticket_message(
            ticket.discord_channel_id,
            &user,
            from.as_deref(),
            &main_message,
            &attachments
                .iter()
                .map(|a| DiscordAttachment {
                    data: &a.data,
                    filename: &a.filename,
                })
                .collect::<Vec<_>>(),
        )
        .await
        .is_err()
    {
        tracing::error!("Failed to send external ticket message");
    }

    Response::builder()
        .header("Content-Type", "application/json")
        .body(Body::from(json!({ "status": "ok" }).to_string()))
        .unwrap()
}

#[derive(Debug, Deserialize)]
pub struct MailgunForm {
    #[serde(rename = "stripped-text")]
    stripped_text: String,
    #[serde(rename = "In-Reply-To")]
    in_reply_to: String,
    #[serde(rename = "From")]
    from: Option<String>,

    timestamp: u64,
    token: String,
    signature: String,
}

impl MailgunProvider {
    pub async fn new(settings: Arc<RwLock<Settings>>) -> Result<(Self, Router<RouterState>)> {
        _ = settings
            .read()
            .await
            .email
            .as_ref()
            .ok_or(crate::errors::RhombusError::MissingConfiguration(
                "email".to_owned(),
            ))?
            .mailgun
            .as_ref()
            .ok_or(crate::errors::RhombusError::MissingConfiguration(
                "mailgun".to_owned(),
            ))?;

        let router = Router::new().route("/mailgun", post(route_mailgun_receive_email));
        Ok((Self { settings }, router))
    }
}

impl InboundEmail for MailgunProvider {
    async fn receive_emails(&self) -> Result<()> {
        Ok(())
    }
}

#[async_trait]
impl OutboundEmailProvider for MailgunProvider {
    async fn send_email(
        &self,
        to: &str,
        subject: &str,
        plaintext: &str,
        html: &str,
        in_reply_to: Option<&str>,
        references: &[String],
    ) -> Result<String> {
        let (mailgun_settings, from) = {
            let settings = self.settings.read().await;
            let email_settings = settings.email.as_ref().unwrap();
            (
                email_settings.mailgun.as_ref().unwrap().clone(),
                email_settings.from.clone(),
            )
        };

        let mailgun_endpoint = mailgun_settings
            .endpoint
            .as_deref()
            .unwrap_or("https://api.mailgun.net/v3");

        let response = reqwest::Client::new()
            .post(format!(
                "{}/{}/messages",
                mailgun_endpoint, mailgun_settings.domain
            ))
            .basic_auth("api", Some(mailgun_settings.api_key))
            .form(&[
                ("from", Some(from)),
                ("to", Some(to.to_owned())),
                ("subject", Some(subject.to_owned())),
                ("text", Some(plaintext.to_owned())),
                ("html", Some(html.to_owned())),
                ("h:in-reply-to", in_reply_to.map(|s| s.to_owned())),
                (
                    "h:references",
                    (!references.is_empty()).then(|| references.join(" ")),
                ),
            ])
            .send()
            .await?;

        #[derive(Deserialize)]
        struct Response {
            id: String,
        }
        let id = response.json::<Response>().await.map(|r| r.id)?;

        Ok(id)
    }
}
