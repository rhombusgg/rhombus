use std::{
    collections::{btree_map, BTreeMap},
    num::NonZeroU64,
    sync::Arc,
};

use chrono::{DateTime, Utc};
use rand::{prelude::SliceRandom, thread_rng, Rng};
use serde::Serialize;
use serde_json::json;
use serenity::{
    all::{
        ButtonStyle, ChannelId, ChannelType, CreateActionRow, CreateAttachment, CreateButton,
        CreateEmbed, CreateEmbedAuthor, CreateMessage, CreateThread, EditMessage, EditThread,
        GatewayIntents, GetMessages, Http, UserId,
    },
    Client,
};
use tokio::sync::{Mutex, RwLock};

use crate::{
    errors::RhombusError,
    internal::{
        auth::User,
        database::provider::{
            Author, Category, Challenge, ChallengeDivision, Connection, FirstBloods, Team, Ticket,
        },
        email::outbound_mailer::OutboundMailer,
        settings::Settings,
    },
    Result,
};

pub struct Bot {
    http: Arc<Http>,
    db: Connection,
    settings: &'static RwLock<Settings>,
}

pub struct Data {
    settings: &'static RwLock<Settings>,
    db: Connection,
    outbound_mailer: Option<&'static OutboundMailer>,
}
pub type DiscordError = Box<dyn std::error::Error + Send + Sync>;
pub type Context<'a> = poise::Context<'a, Data, DiscordError>;

/// Go to the CTF profile page of a corresponding user
#[poise::command(slash_command, ephemeral)]
pub async fn whois(
    ctx: Context<'_>,
    #[description = "User to look up"] user: serenity::all::User,
) -> std::result::Result<(), DiscordError> {
    if let Ok(user) = ctx.data().db.get_user_from_discord_id(user.id.into()).await {
        ctx.reply(format!(
            "Found! [Go to {}'s user profile]({}/user/{})",
            user.name,
            ctx.data().settings.read().await.location_url,
            user.id,
        ))
        .await?;
    } else {
        ctx.reply("Could not find user").await?;
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

    {
        let mut settings = ctx.data().settings.write().await;
        settings.discord.first_blood_channel_id = Some(channel.id.into());
        ctx.data().db.save_settings(&settings).await?;
    }

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

    {
        let mut settings = ctx.data().settings.write().await;
        settings.discord.support_channel_id = Some(channel.id.into());
        ctx.data().db.save_settings(&settings).await?;
    }

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
            settings.discord.support_channel_id,
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

        ctx.reply(format!(
            "Sent https://discord.com/channels/{}/{}/{}",
            ctx.guild_id().unwrap(),
            message.channel_id,
            message.id
        ))
        .await?;
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

    {
        let mut settings = ctx.data().settings.write().await;
        settings.discord.author_role_id = Some(role.id.into());
        ctx.data().db.save_settings(&settings).await?;
    }

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

    {
        let mut settings = ctx.data().settings.write().await;
        settings.discord.verified_role_id = Some(role.id.into());
        ctx.data().db.save_settings(&settings).await?;
    }

    ctx.reply(format!(
        "Successfully bound <@&{}> as the verified role",
        role.id
    ))
    .await?;

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
            format_role(settings.discord.verified_role_id),
            format_role(settings.discord.author_role_id),
            format_channel(settings.discord.first_blood_channel_id),
            format_channel(settings.discord.support_channel_id),
            settings.default_ticket_template
        )
    };

    ctx.reply(message).await?;

    Ok(())
}

lazy_static::lazy_static! {
    pub static ref DIGEST_DEBOUNCER: Mutex<BTreeMap<ChannelId, i64>> = Default::default();
}

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
    let outbound_mailer = if let Some(outbound_mailer) = data.outbound_mailer {
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
    tokio::time::sleep(std::time::Duration::from_secs(5)).await;
    if let Some(timestamp) = DIGEST_DEBOUNCER.lock().await.remove(&channel) {
        if timestamp != now {
            return Ok(());
        }
    }

    let messages = channel.messages(ctx, GetMessages::new().limit(100)).await?;

    let rhombus_user_id = { data.settings.read().await.discord.client_id };

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
        .iter()
        .filter(|message| {
            matches!(
                message.kind,
                serenity::all::MessageType::Regular | serenity::all::MessageType::InlineReply
            )
        })
        .map(|message| DigestMessage {
            author: authors.get(&message.author.id).unwrap(),
            content: message.content.clone(),
            edited_timestamp: message.edited_timestamp.map(|t| t.to_utc()),
            timestamp: message.timestamp.to_utc(),
        })
        .collect::<Vec<_>>();
    messages.sort();

    outbound_mailer.send_digest(ticket, &messages).await?;
    tracing::info!("Sent digest");

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
            settings.discord.support_channel_id,
            settings.discord.client_id,
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
        settings: &'static RwLock<Settings>,
        db: Connection,
        mailer: Option<&'static OutboundMailer>,
    ) -> Self {
        let bot_token = { settings.read().await.discord.bot_token.clone() };

        let framework = poise::Framework::builder()
            .options(poise::FrameworkOptions {
                commands: vec![admin(), whois()],
                event_handler: |ctx, event, framework, data| {
                    Box::pin(event_handler(ctx, event, framework, data))
                },
                ..Default::default()
            })
            .setup(move |ctx, _ready, framework| {
                Box::pin(async move {
                    poise::builtins::register_globally(ctx, &framework.options().commands).await?;
                    Ok(Data {
                        settings,
                        db,
                        outbound_mailer: mailer,
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
                settings.discord.invite_url.clone(),
                settings.discord.guild_id,
                settings.discord.client_id,
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
                settings.discord.support_channel_id,
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

        self.db
            .create_ticket(ticket_number, user.id, challenge.id, thread.id.into())
            .await?;

        thread
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
                                    challenge.name, location_url, challenge.name
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

    pub async fn send_first_blood(
        &self,
        user: &User,
        team: &Team,
        challenge: &Challenge,
        divisions: &BTreeMap<i64, ChallengeDivision>,
        categories: &[Category],
        first_bloods: &FirstBloods,
    ) -> Result<()> {
        let category = categories
            .iter()
            .find(|category| category.id == challenge.category_id)
            .unwrap();

        let divisions = first_bloods
            .division_ids
            .iter()
            .map(|division_id| divisions[division_id].name.as_str())
            .collect::<Vec<&str>>();
        let division_string = format_list_en(&divisions);

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
            "🌪",
            ":crossed_swords:",
        ];
        let emoji = emoji
            .choose_multiple(&mut thread_rng(), thread_rng().gen_range(1..=4))
            .cloned()
            .collect::<Vec<&str>>()
            .join(" ");

        ChannelId::from(
            self.settings
                .read()
                .await
                .discord
                .first_blood_channel_id
                .ok_or(RhombusError::MissingConfiguration(
                    "first blood channel id".to_owned(),
                ))?,
        )
        .send_message(
            &self.http,
            CreateMessage::new().content(if let Some(discord_id) = user.discord_id {
                format!(
                    "Congrats to <@{}> on team **{}** for first blood on **{} / {}** in {}! {}",
                    discord_id, team.name, category.name, challenge.name, division_string, emoji,
                )
            } else {
                format!(
                    "Congrats to {} on team **{}** for first blood on **{} / {}** in {}! {}",
                    user.name, team.name, category.name, challenge.name, division_string, emoji,
                )
            }),
        )
        .await?;
        Ok(())
    }

    pub async fn verify_user(&self, discord_id: NonZeroU64) -> Result<()> {
        let (verified_role_id, guild_id) = {
            let settings = self.settings.read().await;
            (settings.discord.verified_role_id, settings.discord.guild_id)
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
        message: &str,
        attachments: &[DiscordAttachment<'_>],
    ) -> Result<()> {
        let channel_id = ChannelId::from(channel_id);

        let attachments = attachments
            .iter()
            .map(|attachment| CreateAttachment::bytes(attachment.data, attachment.filename))
            .collect::<Vec<_>>();

        channel_id
            .send_message(
                &self.http,
                CreateMessage::new()
                    .embed(
                        CreateEmbed::new()
                            .author(
                                CreateEmbedAuthor::new(&user.name)
                                    .icon_url(&user.avatar)
                                    .url(format!(
                                        "{}/user/{}",
                                        self.settings.read().await.location_url,
                                        user.id
                                    )),
                            )
                            .description(message),
                    )
                    .files(attachments),
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

lazy_static::lazy_static! {
    pub static ref INVITE_URL_CACHE: RwLock<DiscordInviteUrlCache> = RwLock::new(DiscordInviteUrlCache {
        url: String::new(),
        timestamp: 0,
    });
}

fn format_list_en(items: &[&str]) -> String {
    match items.len() {
        0 => String::new(),
        1 => format!("**{}** division", items[0]),
        2 => format!("**{}** and **{}** divisions", items[0], items[1]),
        _ => {
            let mut formatted = String::new();
            for (i, item) in items.iter().take(items.len() - 1).enumerate() {
                formatted.push_str("**");
                formatted.push_str(item);
                formatted.push_str("**");
                if i < items.len() - 2 {
                    formatted.push_str(", ");
                } else {
                    formatted.push_str(", and ");
                }
            }
            formatted.push_str("**");
            formatted.push_str(items[items.len() - 1]);
            formatted.push_str("**");
            formatted.push_str(" divisions");
            formatted
        }
    }
}
