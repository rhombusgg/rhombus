use std::{collections::BTreeMap, num::NonZeroU64, sync::Arc};

use rand::{prelude::SliceRandom, thread_rng, Rng};
use serde_json::json;
use serenity::{
    all::{
        ButtonStyle, ChannelId, ChannelType, CreateActionRow, CreateButton, CreateEmbed,
        CreateMessage, CreateThread, GatewayIntents, Http, UserId,
    },
    Client,
};
use tokio::sync::RwLock;

use crate::{
    errors::RhombusError,
    internal::{
        auth::User,
        database::provider::{
            Author, Category, Challenge, ChallengeDivision, Connection, FirstBloods, Team,
        },
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

impl Bot {
    pub async fn new(settings: Arc<RwLock<Settings>>, db: Connection) -> Self {
        let bot_token = { settings.read().await.discord.bot_token.clone() };

        let s = settings.clone();
        let d = db.clone();
        let framework = poise::Framework::builder()
            .options(poise::FrameworkOptions {
                commands: vec![admin(), whois()],
                ..Default::default()
            })
            .setup(|ctx, _ready, framework| {
                Box::pin(async move {
                    poise::builtins::register_globally(ctx, &framework.options().commands).await?;
                    Ok(Data { settings: s, db: d })
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

        let ticket_number = self.db.create_ticket(user.id, challenge.id).await?;

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
                                format!(
                                    "<@{}> [:link:]({}/user/{})",
                                    user.discord_id, location_url, user.id
                                ),
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

        self.http
            .add_thread_channel_member(thread.id, UserId::from(user.discord_id))
            .await?;

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
            CreateMessage::new().content(format!(
                "Congrats to <@{}> on team **{}** for first blood on **{} / {}** in {}! {}",
                user.discord_id, team.name, category.name, challenge.name, division_string, emoji,
            )),
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
