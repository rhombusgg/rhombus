use std::{
    borrow::Cow,
    collections::{btree_map, BTreeMap},
    net::IpAddr,
    num::NonZeroU64,
    sync::{Arc, LazyLock},
};

use chrono::{DateTime, Local, Utc};
use chrono_tz::Tz;
use dashmap::DashMap;
use futures::{future::join_all, StreamExt};
use minijinja::context;
use rand::{prelude::SliceRandom, thread_rng, Rng};
use reqwest::header;
use serde::{Deserialize, Serialize};
use serde_json::json;
use serenity::{
    all::{
        ButtonStyle, ChannelId, ChannelType, CreateActionRow, CreateAttachment, CreateButton,
        CreateEmbed, CreateEmbedAuthor, CreateMessage, CreateThread, EditMessage, EditThread,
        GatewayIntents, GetMessages, Http, MessageFlags, MessageId, UserId,
    },
    Client,
};
use tokio::sync::{Mutex, RwLock};

use crate::{
    errors::RhombusError,
    internal::{
        auth::User,
        database::provider::{
            Author, Challenge, ChallengeData, Connection, Team, Ticket, ToBeClosedTicket,
        },
        email::outbound_mailer::OutboundMailer,
        settings::Settings,
    },
    Result,
};

pub struct Bot {
    http: Arc<Http>,
    db: Connection,
    settings: Arc<RwLock<Settings>>,
}

pub struct Data {
    settings: Arc<RwLock<Settings>>,
    db: Connection,
    outbound_mailer: Option<Arc<OutboundMailer>>,
    jinja: Arc<minijinja::Environment<'static>>,
}
pub type DiscordError = Box<dyn std::error::Error + Send + Sync>;
pub type Context<'a> = poise::Context<'a, Data, DiscordError>;

pub static IP_CACHE: LazyLock<DashMap<IpAddr, IPInfo>> = LazyLock::new(DashMap::new);

#[derive(Clone, Debug)]
pub struct IPInfo {
    pub country: [u8; 2],
    pub timezone: Tz,
}

async fn ip_info(ip: IpAddr) -> Result<IPInfo> {
    if let Some(ip_info) = IP_CACHE.get(&ip) {
        return Ok(ip_info.clone());
    }

    #[derive(Deserialize)]
    struct IPInfoResponse {
        country: String,
        timezone: String,
    }
    let mut response = reqwest::get(&format!("https://ipinfo.io/{}/json", ip))
        .await?
        .json::<IPInfoResponse>()
        .await?;

    response.country.make_ascii_lowercase();
    let country_bytes = response.country.as_bytes();

    let info = IPInfo {
        country: [country_bytes[0], country_bytes[1]],
        timezone: response.timezone.parse().unwrap_or(Tz::UTC),
    };

    IP_CACHE.insert(ip, info.clone());

    Ok(info)
}

fn get_local_time(tz: &Tz) -> String {
    let local_time: DateTime<Tz> = Local::now().with_timezone(tz);

    local_time.format("%H:%M").to_string()
}

/// Go to the CTF profile page of a corresponding user
#[poise::command(slash_command, ephemeral)]
pub async fn whois(
    ctx: Context<'_>,
    #[description = "User to look up"] user: serenity::all::User,
) -> std::result::Result<(), DiscordError> {
    let author_discord_id = ctx.author().id;

    let author_discord_role_id = ctx
        .data()
        .settings
        .read()
        .await
        .discord
        .as_ref()
        .and_then(|d| d.author_role_id);

    let is_author = if let Some(author_discord_role_id) = author_discord_role_id {
        ctx.author()
            .has_role(ctx.http(), ctx.guild_id().unwrap(), author_discord_role_id)
            .await
            .unwrap()
    } else {
        false
    };

    let is_admin = ctx
        .data()
        .db
        .get_user_from_discord_id(author_discord_id.into())
        .await
        .map(|user| user.is_admin)
        .unwrap_or(false);

    let is_privileged = is_author || is_admin;

    if let Ok(rhombus_user) = ctx.data().db.get_user_from_discord_id(user.id.into()).await {
        let rhombus_team = ctx.data().db.get_team_from_id(rhombus_user.team_id).await?;
        let team_tracks = Arc::new(ctx.data().db.get_team_tracks(rhombus_team.id).await?);
        let location_url = &ctx.data().settings.read().await.location_url;

        let team_members_futures = rhombus_team.users.iter().map(|(user_id, user)| {
            let team_tracks = team_tracks.clone();
            let user_name = user.name.clone();
            let discord_id = user.discord_id;
            let user_id = *user_id;

            async move {
                let mut flag = String::default();

                if is_privileged {
                    if let Some(track) = team_tracks.get(&user_id) {
                        flag = if let Ok(info) = ip_info(track.ip).await {
                            format!(
                                ":flag_{}: {} local time, last seen <t:{}:R> ||`{}`||",
                                String::from_utf8_lossy(&info.country),
                                get_local_time(&info.timezone),
                                track.last_seen_at.timestamp(),
                                track.ip
                            )
                        } else {
                            format!(
                                "last seen <t:{}:R> ||`{}`||",
                                track.last_seen_at.timestamp(),
                                track.ip
                            )
                        }
                    };
                }

                if let Some(discord_id) = discord_id {
                    format!(
                        ":identification_card: <@{}> | [{}]({}/user/{})   {}",
                        discord_id, user_name, location_url, user_id, flag
                    )
                } else {
                    format!(
                        ":identification_card: [{}]({}/user/{})   {}",
                        user_name, location_url, user_id, flag
                    )
                }
            }
        });

        let team_members_string = join_all(team_members_futures).await.join("\n");

        ctx.reply(format!(
            "Looked up <@{}>\n\n:red_square: Team [{}]({}/team/{})\n{}",
            user.id, rhombus_team.name, location_url, rhombus_team.id, team_members_string,
        ))
        .await?;
    } else {
        ctx.reply(format!(
            "Could not find associated CTF account for <@{}>",
            user.id
        ))
        .await?;
    }

    Ok(())
}

#[poise::command(
    slash_command,
    subcommands("firstbloods", "support", "author", "verified", "status"),
    subcommand_required,
    default_member_permissions = "ADMINISTRATOR"
)]
pub async fn admin(_: Context<'_>) -> std::result::Result<(), DiscordError> {
    Ok(())
}

/// Set the first blood channel
#[poise::command(slash_command, ephemeral)]
pub async fn firstbloods(
    ctx: Context<'_>,
    #[description = "Channel to send first bloods to"] channel: serenity::all::GuildChannel,
) -> std::result::Result<(), DiscordError> {
    if ctx.data().settings.read().await.immutable_config {
        ctx.reply("Can not set first bloods channel because configuration is immutable")
            .await?;
        return Ok(());
    }

    // {
    //     let mut settings = ctx.data().settings.write().await;
    //     settings.discord.as_mut().unwrap().first_blood_channel_id = Some(channel.id.into());
    //     ctx.data().db.save_settings(&settings).await?;
    // }

    ctx.reply(format!(
        "Successfully bound <#{}> as the first blood channel",
        channel.id
    ))
    .await?;

    Ok(())
}

#[poise::command(
    slash_command,
    subcommands("support_link", "support_panel"),
    subcommand_required
)]
pub async fn support(_: Context<'_>) -> std::result::Result<(), DiscordError> {
    Ok(())
}

/// Set the support channel
#[poise::command(slash_command, ephemeral, rename = "link")]
pub async fn support_link(
    ctx: Context<'_>,
    #[description = "Channel to make support threads off of"] channel: serenity::all::GuildChannel,
) -> std::result::Result<(), DiscordError> {
    if ctx.data().settings.read().await.immutable_config {
        ctx.reply("Can not set support channel because configuration is immutable")
            .await?;
        return Ok(());
    }

    // {
    //     let mut settings = ctx.data().settings.write().await;
    //     settings.discord.as_mut().unwrap().support_channel_id = Some(channel.id.into());
    //     ctx.data().db.save_settings(&settings).await?;
    // }

    ctx.reply(format!(
        "Successfully bound <#{}> as the support channel",
        channel.id
    ))
    .await?;

    Ok(())
}

/// Send the panel message to the current support channel
#[poise::command(slash_command, ephemeral, rename = "panel")]
pub async fn support_panel(ctx: Context<'_>) -> std::result::Result<(), DiscordError> {
    let (support_channel_id, location_url) = {
        let settings = ctx.data().settings.read().await;
        (
            settings.discord.as_ref().unwrap().support_channel_id,
            settings.location_url.clone(),
        )
    };

    if let Some(support_channel_id) = support_channel_id {
        let message = ChannelId::from(support_channel_id)
            .send_message(ctx.http(), CreateMessage::new().embed(
                CreateEmbed::new()
                    .color((0x00, 0x99, 0xff))
                    .title("Ticket")
                    .description("Submit a ticket for a challenge from the CTF website by clicking on the :tickets: button in the header of the challenge in question.")
            ).components(vec![
                CreateActionRow::Buttons(vec![
                    CreateButton::new_link(format!("{}/challenges", location_url))
                        .label("Go to Challenges"),
                ])
            ]))
            .await?;

        ctx.reply(format!("Sent {}", message.link())).await?;
    } else {
        ctx.reply("No support channel selected").await?;
    }

    Ok(())
}

/// Link the author role
#[poise::command(slash_command, ephemeral)]
pub async fn author(
    ctx: Context<'_>,
    #[description = "Role to link authors to"] role: serenity::all::Role,
) -> std::result::Result<(), DiscordError> {
    if ctx.data().settings.read().await.immutable_config {
        ctx.reply("Can not set author role because configuration is immutable")
            .await?;
        return Ok(());
    }

    // {
    //     let mut settings = ctx.data().settings.write().await;
    //     settings.discord.as_mut().unwrap().author_role_id = Some(role.id.into());
    //     ctx.data().db.save_settings(&settings).await?;
    // }

    ctx.reply(format!(
        "Successfully bound <@&{}> as the author role",
        role.id
    ))
    .await?;

    Ok(())
}

/// Link the verified role
#[poise::command(slash_command, ephemeral)]
pub async fn verified(
    ctx: Context<'_>,
    #[description = "Role to assign verified users to"] role: serenity::all::Role,
) -> std::result::Result<(), DiscordError> {
    if ctx.data().settings.read().await.immutable_config {
        ctx.reply("Can not set verified role because configuration is immutable")
            .await?;
        return Ok(());
    }

    // {
    //     let mut settings = ctx.data().settings.write().await;
    //     settings.discord.as_mut().unwrap().verified_role_id = Some(role.id.into());
    //     ctx.data().db.save_settings(&settings).await?;
    // }

    ctx.reply(format!(
        "Successfully bound <@&{}> as the verified role",
        role.id
    ))
    .await?;

    Ok(())
}

#[derive(Debug, Serialize)]
struct ChatCompletionRequest {
    model: String,
    messages: Vec<ChatMessage>,
    temperature: f32,
}

#[derive(Debug, Serialize)]
struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct ChatCompletionResponse {
    choices: Vec<Choice>,
}

#[derive(Debug, Deserialize)]
struct Choice {
    message: ResponseMessage,
}

#[derive(Debug, Deserialize)]
struct ResponseMessage {
    content: String,
}

#[derive(Debug, Deserialize, Serialize)]
struct AIMessage {
    content: String,
    is_author: bool,
    timestamp: DateTime<Utc>,
}

/// Ask AI for a suggested answer to this ticket (author only)
#[poise::command(slash_command, ephemeral)]
pub async fn ai(ctx: Context<'_>) -> std::result::Result<(), DiscordError> {
    ctx.defer_ephemeral().await.unwrap();

    let (openai_api_key, author_discord_role_id) = {
        let settings = ctx.data().settings.read().await;
        (
            settings.openai_api_key.clone(),
            settings.discord.as_ref().and_then(|d| d.author_role_id),
        )
    };

    let Some(author_discord_role_id) = author_discord_role_id else {
        ctx.reply("AI is not configured. Author role not set")
            .await?;
        return Ok(());
    };

    let is_author = ctx
        .author()
        .has_role(ctx.http(), ctx.guild_id().unwrap(), author_discord_role_id)
        .await
        .unwrap_or(false);

    if !is_author {
        ctx.reply("You do not have permission to run this command")
            .await?;
        return Ok(());
    }

    let Some(openai_api_key) = openai_api_key else {
        ctx.reply("OpenAI API key not set").await?;
        return Ok(());
    };

    let thread = ctx.channel_id();

    let Ok(ticket) = ctx
        .data()
        .db
        .get_ticket_by_discord_channel_id(thread.into())
        .await
    else {
        ctx.reply("Could not find associated ticket in the database")
            .await?;
        return Ok(());
    };

    let challenge_data = ctx.data().db.get_challenges().await.unwrap();
    let challenge = challenge_data
        .challenges
        .iter()
        .find(|c| c.id == ticket.challenge_id)
        .unwrap();
    let category = challenge_data
        .categories
        .iter()
        .find(|c| c.id == challenge.category_id)
        .unwrap();

    let ticket_channel_ids = ctx
        .data()
        .db
        .get_discord_ticket_channel_ids_for_challenge(ticket.challenge_id)
        .await?;

    let mut chats = vec![];
    for channel_id in ticket_channel_ids {
        let channel: ChannelId = channel_id.into();
        let mut discord_messages = channel.messages_iter(&ctx).boxed();

        let mut messages = vec![];
        while let Some(Ok(discord_message)) = discord_messages.next().await {
            if discord_message.content.is_empty() {
                continue;
            }

            let is_author = discord_message
                .author
                .has_role(ctx.http(), ctx.guild_id().unwrap(), author_discord_role_id)
                .await
                .unwrap_or(false);

            messages.push(AIMessage {
                is_author,
                content: discord_message.content.clone(),
                timestamp: discord_message.timestamp.to_utc(),
            });
        }
        messages.sort_by_key(|m| m.timestamp);
        chats.push(messages);
    }

    let prompt = ctx
        .data()
        .jinja
        .get_template("prompt.txt")
        .unwrap()
        .render(context! {
            challenge,
            category,
            chats,
        })
        .unwrap();

    let mut last_message = String::default();
    let mut discord_messages = thread.messages_iter(&ctx).boxed();
    while let Some(discord_message) = discord_messages.next().await {
        if let Ok(discord_message) = discord_message {
            if !discord_message.content.is_empty() {
                last_message = discord_message.content;
                break;
            }
        }
    }

    let mut headers = header::HeaderMap::new();
    headers.insert(
        "Authorization",
        header::HeaderValue::from_str(&format!("Bearer {}", openai_api_key))?,
    );
    headers.insert(
        "Content-Type",
        header::HeaderValue::from_static("application/json"),
    );

    let client = reqwest::Client::builder()
        .default_headers(headers)
        .build()?;

    let request = ChatCompletionRequest {
        model: "gpt-3.5-turbo".to_string(),
        messages: vec![
            ChatMessage {
                role: "system".to_string(),
                content: prompt,
            },
            ChatMessage {
                role: "user".to_string(),
                content: last_message,
            },
        ],
        temperature: 0.2,
    };

    let response = client
        .post("https://api.openai.com/v1/chat/completions")
        .json(&request)
        .send()
        .await?;

    if response.status().is_success() {
        let completion: ChatCompletionResponse = response.json().await?;
        if let Some(choice) = completion.choices.first() {
            ctx.reply(&choice.message.content).await?;
        }
    } else {
        tracing::info!(response=?response);
        ctx.reply(response.text().await?).await?;
    }

    Ok(())
}

pub fn format_role(role: Option<NonZeroU64>) -> String {
    if let Some(role) = role {
        format!("<@&{}>", role)
    } else {
        "(not set)".to_owned()
    }
}

pub fn format_channel(channel: Option<NonZeroU64>) -> String {
    if let Some(channel) = channel {
        format!("<#{}>", channel)
    } else {
        "(not set)".to_owned()
    }
}

pub fn format_bool(b: bool) -> &'static str {
    if b {
        "✅"
    } else {
        "❌"
    }
}

/// Show the current configuration
#[poise::command(slash_command, ephemeral)]
pub async fn status(ctx: Context<'_>) -> std::result::Result<(), DiscordError> {
    let message = {
        let settings = ctx.data().settings.read().await;

        format!(
            "
Immutable Configuration: {}
Location URL: {}

Verified Role {}
Author Role {}
First Blood Channel {}
Support Channel {}

Default Ticket Template
```
{}
```
            ",
            format_bool(settings.immutable_config),
            settings.location_url,
            format_role(settings.discord.as_ref().unwrap().verified_role_id),
            format_role(settings.discord.as_ref().unwrap().author_role_id),
            format_channel(settings.discord.as_ref().unwrap().first_blood_channel_id),
            format_channel(settings.discord.as_ref().unwrap().support_channel_id),
            settings.default_ticket_template
        )
    };

    ctx.reply(message).await?;

    Ok(())
}

pub static DIGEST_DEBOUNCER: LazyLock<Mutex<BTreeMap<ChannelId, i64>>> =
    LazyLock::new(Mutex::default);

#[derive(Debug, Serialize, PartialEq, Eq, PartialOrd, Ord)]
pub struct DigestAuthor {
    pub name: String,
    pub image_url: String,
    pub discord_id: Option<UserId>,
    pub rhombus_id: Option<i64>,
}

#[derive(Debug, Serialize, PartialEq, Eq, PartialOrd, Ord)]
pub struct DigestMessage<'a> {
    pub timestamp: DateTime<Utc>,
    pub author: &'a DigestAuthor,
    pub content: String,
    pub edited_timestamp: Option<DateTime<Utc>>,
}

pub async fn digest_channel(
    ctx: &serenity::all::Context,
    data: &Data,
    channel: ChannelId,
    ticket: &Ticket,
) -> Result<()> {
    // dont send an email digest if we don't have a mailer
    let outbound_mailer = if let Some(ref outbound_mailer) = data.outbound_mailer {
        outbound_mailer
    } else {
        return Ok(());
    };

    // dont send a digest if the user who made the ticket has linked their discord
    let ticket_creator_user = data.db.get_user_from_id(ticket.user_id).await?;
    if ticket_creator_user.discord_id.is_some() {
        return Ok(());
    }

    let now = chrono::Utc::now().timestamp();
    {
        _ = DIGEST_DEBOUNCER.lock().await.insert(channel, now);
    }
    tokio::time::sleep(std::time::Duration::from_secs(60)).await; // debouncing time
    if let Some(timestamp) = DIGEST_DEBOUNCER.lock().await.remove(&channel) {
        if timestamp != now {
            return Ok(());
        }
    }

    let messages = channel.messages(ctx, GetMessages::new().limit(100)).await?;

    let rhombus_user_id = {
        data.settings
            .read()
            .await
            .discord
            .as_ref()
            .unwrap()
            .client_id
    };

    let mut authors = BTreeMap::new();
    for message in &messages {
        match authors.entry(message.author.id) {
            btree_map::Entry::Occupied(_) => {}
            btree_map::Entry::Vacant(entry) => {
                // Rhombus is acting as the intermediary for the email-only user,
                // so messages sent by Rhombus should be attributed to the user
                // who created the thread
                if rhombus_user_id == message.author.id.into() {
                    entry.insert(DigestAuthor {
                        name: ticket_creator_user.name.clone(),
                        image_url: ticket_creator_user.avatar.clone(),
                        discord_id: ticket_creator_user.discord_id.map(|id| id.into()),
                        rhombus_id: Some(ticket_creator_user.id),
                    });
                } else if let Ok(user) = data
                    .db
                    .get_user_from_discord_id(message.author.id.into())
                    .await
                {
                    entry.insert(DigestAuthor {
                        name: user.name.clone(),
                        image_url: user.avatar.clone(),
                        discord_id: user.discord_id.map(|id| id.into()),
                        rhombus_id: Some(user.id),
                    });
                } else {
                    entry.insert(DigestAuthor {
                        name: message.author.name.clone(),
                        image_url: message.author.avatar_url().unwrap_or_default(),
                        discord_id: Some(message.author.id),
                        rhombus_id: None,
                    });
                }
            }
        }
    }

    let mut messages = messages
        .into_iter()
        .filter(|message| {
            matches!(
                message.kind,
                serenity::all::MessageType::Regular | serenity::all::MessageType::InlineReply
            )
        })
        .map(|message| DigestMessage {
            author: authors.get(&message.author.id).unwrap(),
            content: message.content,
            edited_timestamp: message.edited_timestamp.map(|t| t.to_utc()),
            timestamp: message.timestamp.to_utc(),
        })
        .collect::<Vec<_>>();
    messages.sort();

    outbound_mailer.send_digest(ticket, &messages[1..]).await?;

    Ok(())
}

async fn event_handler(
    ctx: &serenity::all::Context,
    event: &serenity::all::FullEvent,
    _framework: poise::FrameworkContext<'_, Data, Box<dyn std::error::Error + Send + Sync>>,
    data: &Data,
) -> std::result::Result<(), DiscordError> {
    let (support_channel_id, rhombus_user_id) = {
        let settings = data.settings.read().await;
        (
            settings.discord.as_ref().unwrap().support_channel_id,
            settings.discord.as_ref().unwrap().client_id,
        )
    };

    if let Some(support_channel_id) = support_channel_id {
        let support_channel: ChannelId = support_channel_id.into();
        match event {
            serenity::all::FullEvent::Message { new_message } => {
                if rhombus_user_id == new_message.author.id.into() {
                    return Ok(());
                }

                if let Some(channel) = new_message.channel(ctx).await?.guild() {
                    if let Some(parent_id) = channel.parent_id {
                        if parent_id == support_channel {
                            let ticket = data
                                .db
                                .get_ticket_by_discord_channel_id(channel.id.into())
                                .await?;
                            digest_channel(ctx, data, channel.id, &ticket).await?;
                        }
                    }
                }
            }
            serenity::all::FullEvent::MessageUpdate {
                old_if_available: _,
                new: _,
                event,
            } => {
                if let Some(channel) = event.channel_id.to_channel(ctx).await?.guild() {
                    if let Some(parent_id) = channel.parent_id {
                        if parent_id == support_channel {
                            let ticket = data
                                .db
                                .get_ticket_by_discord_channel_id(channel.id.into())
                                .await?;
                            digest_channel(ctx, data, channel.id, &ticket).await?;
                        }
                    }
                }
            }
            serenity::all::FullEvent::InteractionCreate { interaction } => {
                if let Some(interaction) = interaction.as_message_component() {
                    if interaction.data.custom_id.starts_with("close-ticket-") {
                        let ticket_number = interaction.data.custom_id["close-ticket-".len()..]
                            .parse::<u64>()
                            .unwrap();

                        let now = chrono::Utc::now();
                        data.db.close_ticket(ticket_number, now).await?;

                        interaction
                            .message
                            .clone()
                            .edit(
                                ctx,
                                EditMessage::new().components(vec![CreateActionRow::Buttons(
                                    vec![CreateButton::new(format!(
                                        "reopen-ticket-{}",
                                        ticket_number
                                    ))
                                    .style(ButtonStyle::Primary)
                                    .label("Reopen Ticket")
                                    .emoji('🔓')],
                                )]),
                            )
                            .await?;

                        interaction.defer(ctx).await?;

                        let thread = interaction.channel_id;
                        thread
                            .edit_thread(ctx, EditThread::new().archived(true))
                            .await?;
                    }

                    if interaction.data.custom_id.starts_with("reopen-ticket-") {
                        let ticket_number = interaction.data.custom_id["reopen-ticket-".len()..]
                            .parse::<u64>()
                            .unwrap();

                        data.db.reopen_ticket(ticket_number).await?;

                        interaction
                            .message
                            .clone()
                            .edit(
                                ctx,
                                EditMessage::new().components(vec![CreateActionRow::Buttons(
                                    vec![CreateButton::new(format!(
                                        "close-ticket-{}",
                                        ticket_number
                                    ))
                                    .style(ButtonStyle::Primary)
                                    .label("Close Ticket")
                                    .emoji('🔒')],
                                )]),
                            )
                            .await?;

                        interaction.defer(ctx).await?;

                        let thread = interaction.channel_id;
                        thread
                            .edit_thread(ctx, EditThread::new().archived(false))
                            .await?;
                    }
                }
            }
            _ => {}
        }
    }
    Ok(())
}

impl Bot {
    pub async fn new(
        settings: Arc<RwLock<Settings>>,
        db: Connection,
        outbound_mailer: Option<Arc<OutboundMailer>>,
        jinja: Arc<minijinja::Environment<'static>>,
    ) -> Self {
        let bot_token = {
            settings
                .read()
                .await
                .discord
                .as_ref()
                .unwrap()
                .bot_token
                .clone()
        };

        let framework_rhombus_settings = settings.clone();
        let framework_rhombus_db = db.clone();

        let framework = poise::Framework::builder()
            .options(poise::FrameworkOptions {
                commands: vec![admin(), whois(), ai()],
                event_handler: |ctx, event, framework, data| {
                    Box::pin(event_handler(ctx, event, framework, data))
                },
                ..Default::default()
            })
            .setup(move |ctx, _ready, framework| {
                Box::pin(async move {
                    poise::builtins::register_globally(ctx, &framework.options().commands).await?;
                    Ok(Data {
                        settings: framework_rhombus_settings,
                        db: framework_rhombus_db,
                        outbound_mailer,
                        jinja,
                    })
                })
            })
            .build();

        let intents = GatewayIntents::non_privileged();
        let mut discord_client = Client::builder(&bot_token, intents)
            .framework(framework)
            .await
            .unwrap();
        let h = discord_client.http.clone();

        tokio::task::spawn(async move {
            discord_client.start().await.unwrap();
        });

        Self {
            http: h,
            db,
            settings,
        }
    }

    pub async fn get_invite_url(&self) -> Result<String> {
        let (invite_url, guild_id, client_id) = {
            let settings = self.settings.read().await;
            (
                settings.discord.as_ref().unwrap().invite_url.clone(),
                settings.discord.as_ref().unwrap().guild_id,
                settings.discord.as_ref().unwrap().client_id,
            )
        };
        if let Some(invite_url) = invite_url {
            return Ok(invite_url);
        }

        {
            let cached_invite_url = INVITE_URL_CACHE.read().await;
            if cached_invite_url.timestamp + 60 > chrono::Utc::now().timestamp() {
                return Ok(cached_invite_url.url.clone());
            }
        }

        let channels = self.http.get_channels(guild_id.into()).await?;
        let guild = self.http.get_guild(guild_id.into()).await?;
        let default_channel_id = guild.system_channel_id.unwrap_or(channels[0].id);

        let guild_invites = self.http.get_guild_invites(guild_id.into()).await?;
        let invite = guild_invites
            .iter()
            .find(|invite| invite.inviter.as_ref().map(|user| user.id) == Some(client_id.into()));

        let invite_code = match invite {
            Some(invite) => invite.code.clone(),
            None => self
                .http
                .create_invite(
                    default_channel_id,
                    &json!({
                        "max_age": 0,
                    }),
                    Some("Rhombus CTF website invite"),
                )
                .await?
                .code
                .clone(),
        };

        let invite_url = format!("https://discord.gg/{}", invite_code);

        {
            let mut cached_invite_url = INVITE_URL_CACHE.write().await;
            cached_invite_url.url = invite_url.clone();
            cached_invite_url.timestamp = chrono::Utc::now().timestamp();
        }

        tracing::trace!("evicted invite url cache");

        Ok(invite_url)
    }

    pub async fn create_support_thread(
        &self,
        user: &User,
        team: &Team,
        challenge: &Challenge,
        author: &Author,
        content: impl AsRef<str>,
    ) -> Result<()> {
        let (support_channel_id, location_url) = {
            let settings = self.settings.read().await;
            (
                settings.discord.as_ref().unwrap().support_channel_id,
                settings.location_url.clone(),
            )
        };
        if support_channel_id.is_none() {
            return Ok(());
        }

        let ticket_number = self.db.get_next_ticket_number().await?;

        let thread = ChannelId::from(support_channel_id.unwrap())
            .create_thread(
                &self.http,
                CreateThread::new(format!(
                    "{}-[{}]-[{}]",
                    ticket_number, challenge.name, user.name
                ))
                .kind(ChannelType::PrivateThread),
            )
            .await?;

        let panel_message = thread
            .send_message(
                &self.http,
                CreateMessage::new()
                    .embed(
                        CreateEmbed::new()
                            .color((0x00, 0x99, 0xff))
                            .title("Ticket")
                            .field(
                                ":identification_card: Opened By",
                                if let Some(discord_id) = user.discord_id {
                                    format!(
                                        "<@{}> [:link:]({}/user/{})",
                                        discord_id, location_url, user.id
                                    )
                                } else {
                                    format!(
                                        "{} [:link:]({}/user/{})",
                                        user.name, location_url, user.id
                                    )
                                },
                                true,
                            )
                            .field(
                                ":red_square: Team",
                                format!("[{}]({}/team/{})", team.name, location_url, team.id),
                                true,
                            )
                            .field(
                                ":watch: Opened",
                                format!("<t:{}:F>", chrono::Utc::now().timestamp()),
                                true,
                            )
                            .field(
                                ":crossed_swords: Challenge",
                                format!(
                                    "[{}]({}/challenges#{})",
                                    challenge.name,
                                    location_url,
                                    urlencoding::encode(&challenge.name)
                                ),
                                true,
                            )
                            .field(
                                ":bookmark: Author",
                                format!("<@{}>", author.discord_id),
                                true,
                            )
                            .field("", "", true),
                    )
                    .components(vec![CreateActionRow::Buttons(vec![CreateButton::new(
                        format!("close-ticket-{}", ticket_number),
                    )
                    .style(ButtonStyle::Primary)
                    .label("Close Ticket")
                    .emoji('🔒')])]),
            )
            .await?;

        self.db
            .create_ticket(
                ticket_number,
                user.id,
                challenge.id,
                thread.id.into(),
                panel_message.id.into(),
            )
            .await?;

        thread
            .send_message(&self.http, CreateMessage::new().content(content.as_ref()))
            .await?;

        if let Some(discord_id) = user.discord_id {
            self.http
                .add_thread_channel_member(thread.id, UserId::from(discord_id))
                .await?;
        }

        self.http
            .add_thread_channel_member(thread.id, UserId::from(author.discord_id))
            .await?;

        Ok(())
    }

    pub async fn close_tickets(&self, to_be_closed_tickets: &[ToBeClosedTicket]) -> Result<()> {
        let celebration_messages = [
            "Nice job on solving the challenge! 🎉",
            "Great work solving the challenge! 🚩",
            "Congratulations on solving the challenge! 🏆",
            "Well done on solving the challenge! 🏅",
        ];

        for to_be_closed_ticket in to_be_closed_tickets {
            let thread = ChannelId::from(to_be_closed_ticket.discord_channel_id);

            let mut panel_message = thread
                .message(
                    &self.http,
                    MessageId::from(to_be_closed_ticket.discord_panel_message_id),
                )
                .await
                .unwrap();
            panel_message
                .edit(
                    &self.http,
                    EditMessage::new().components(vec![CreateActionRow::Buttons(vec![
                        CreateButton::new(format!(
                            "reopen-ticket-{}",
                            to_be_closed_ticket.ticket_number
                        ))
                        .style(ButtonStyle::Primary)
                        .label("Reopen Ticket")
                        .emoji('🔓'),
                    ])]),
                )
                .await
                .unwrap();

            let message = celebration_messages
                .choose(&mut thread_rng())
                .unwrap()
                .to_string();
            thread
                .send_message(&self.http, CreateMessage::new().content(message))
                .await?;
            thread
                .edit_thread(&self.http, EditThread::new().archived(true))
                .await?;
        }

        Ok(())
    }

    pub async fn send_first_blood(
        &self,
        user: &User,
        team: &Team,
        challenge: &Challenge,
        challenge_data: &ChallengeData,
    ) -> Result<()> {
        let category = challenge_data
            .categories
            .iter()
            .find(|category| category.id == challenge.category_id)
            .unwrap();

        let author = challenge_data.authors.get(&challenge.author_id).unwrap();

        let division_name = challenge_data.divisions[&team.division_id].name.as_str();

        let emoji = [
            "🩸",
            "🎉",
            "🔥",
            "🚀",
            "✨",
            "⚡",
            "💥",
            "🏹",
            "💉",
            "👏",
            "🏆",
            "🏅",
            "🎊",
            "🎈",
            "🔔",
            "🫑",
            "🃏",
            "🍍",
            "🍹",
            "🚩",
            "🗡",
            "🗡️",
            "🌪",
            ":crossed_swords:",
        ];
        let emoji = emoji
            .choose_multiple(&mut thread_rng(), thread_rng().gen_range(1..=4))
            .cloned()
            .collect::<Vec<&str>>()
            .join(" ");

        let (channel_id, location_url) = {
            let settings = self.settings.read().await;
            (
                ChannelId::from(
                    settings
                        .discord
                        .as_ref()
                        .unwrap()
                        .first_blood_channel_id
                        .ok_or(RhombusError::MissingConfiguration(
                            "first blood channel id".to_owned(),
                        ))?,
                ),
                settings.location_url.clone(),
            )
        };

        let message = channel_id.send_message(
            &self.http,
            CreateMessage::new().flags(MessageFlags::SUPPRESS_EMBEDS).content({
                let user_link = match user.discord_id {
                    Some(discord_id) => format!("<@{}>", discord_id),
                    None => format!("**[{}]({}/user/{})**", escape_discord_link(&user.name), location_url, user.id),
                };
                format!(
                    "Congrats to {} on team **[{}]({location_url}/team/{})** for first blood on **[{} / {}]({location_url}/challenges#{})** in **{}** division! {}",
                    user_link,
                    escape_discord_link(&team.name),
                    team.id,
                    category.name,
                    challenge.name,
                    urlencoding::encode(&challenge.name),
                    division_name,
                    emoji,
                )
            }),
        )
        .await?;

        let author_discord: UserId = author.discord_id.into();

        let dm_channel = author_discord.create_dm_channel(&self.http).await?;
        dm_channel.send_message(
            &self.http,
            CreateMessage::new()
                .content(format!(
                    "**Check it out!** Someone just first blooded **[{} / {}]({location_url}/challenges#{})** 🩸 {}",
                    category.name,
                    challenge.name,
                    urlencoding::encode(&challenge.name),
                    message.link(),
                )),
            )
            .await?;

        Ok(())
    }

    pub async fn verify_user(&self, discord_id: NonZeroU64) -> Result<()> {
        let (verified_role_id, guild_id) = {
            let settings = self.settings.read().await;
            (
                settings.discord.as_ref().unwrap().verified_role_id,
                settings.discord.as_ref().unwrap().guild_id,
            )
        };

        if verified_role_id.is_none() {
            return Ok(());
        }

        let verified_role_id = verified_role_id.unwrap();

        self.http
            .add_member_role(
                guild_id.into(),
                discord_id.into(),
                verified_role_id.into(),
                Some("Member joined main CTF website"),
            )
            .await?;

        Ok(())
    }

    pub async fn send_external_ticket_message(
        &self,
        channel_id: NonZeroU64,
        user: &User,
        from: Option<&str>,
        message: &str,
        attachments: &[DiscordAttachment<'_>],
    ) -> Result<()> {
        let channel_id = ChannelId::from(channel_id);

        let attachments = attachments
            .iter()
            .map(|attachment| CreateAttachment::bytes(attachment.data, attachment.filename))
            .collect::<Vec<_>>();

        let embed = CreateEmbed::new().author(
            CreateEmbedAuthor::new(&user.name)
                .icon_url(&user.avatar)
                .url(format!(
                    "{}/user/{}",
                    self.settings.read().await.location_url,
                    user.id
                )),
        );

        let embed = if let Some(from) = from {
            embed.description(format!("From: {}", from))
        } else {
            embed
        };

        channel_id
            .send_message(
                &self.http,
                CreateMessage::new()
                    .embed(embed)
                    .files(attachments)
                    .content(message),
            )
            .await?;

        Ok(())
    }
}

pub struct DiscordAttachment<'a> {
    pub filename: &'a str,
    pub data: &'a [u8],
}

pub struct DiscordInviteUrlCache {
    pub url: String,
    pub timestamp: i64,
}

pub static INVITE_URL_CACHE: LazyLock<RwLock<DiscordInviteUrlCache>> = LazyLock::new(|| {
    RwLock::new(DiscordInviteUrlCache {
        url: String::new(),
        timestamp: 0,
    })
});

fn escape_discord_link(input: &str) -> Cow<str> {
    // Discord markdown parsing is frustration.
    let special_characters = &['[', ']', '@', '#', '\\', '*', '`', '_'];
    if input
        .bytes()
        .any(|c| special_characters.contains(&(c as char)))
    {
        format!("`{}`", input.replace(['`', '[', ']', '@'], ""))
            .replace("://", "")
            .into()
    } else {
        input.into()
    }
}
