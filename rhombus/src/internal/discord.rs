use std::{collections::BTreeMap, sync::Arc};

use rand::{prelude::SliceRandom, thread_rng, Rng};
use serenity::{
    all::{
        ChannelId, ChannelType, CreateEmbed, CreateMessage, CreateThread, GatewayIntents, Http,
        UserId,
    },
    Client,
};

use super::{
    auth::User,
    database::{Author, Category, Challenge, Connection, Division, FirstBloods, Team},
    settings::Settings,
};

use crate::{errors::RhombusError, Result};

#[derive(Clone)]
pub struct Bot {
    http: Arc<Http>,
    db: Connection,
    settings: Settings,
}

impl Bot {
    pub async fn new(settings: Settings, db: Connection) -> Self {
        let intents = GatewayIntents::non_privileged();
        let mut discord_client = Client::builder(&settings.discord.bot_token, intents)
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

    pub async fn create_support_thread(
        &self,
        user: &User,
        team: &Team,
        challenge: &Challenge,
        author: &Author,
        content: impl AsRef<str>,
    ) -> Result<()> {
        if self.settings.discord.support_channel_id.is_none() {
            return Ok(());
        }

        let ticket_number = self.db.create_ticket(user.id, challenge.id).await?;

        let thread = ChannelId::from(self.settings.discord.support_channel_id.unwrap())
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
                CreateMessage::new().embed(
                    CreateEmbed::new()
                        .color((0x00, 0x99, 0xff))
                        .title("Ticket")
                        .field(
                            ":identification_card: Opened By",
                            format!(
                                "<@{}> [:link:]({}/user/{})",
                                user.discord_id, self.settings.location_url, user.id
                            ),
                            true,
                        )
                        .field(
                            ":red_square: Team",
                            format!(
                                "[{}]({}/team/{})",
                                team.name, self.settings.location_url, team.id
                            ),
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
                                challenge.name, self.settings.location_url, challenge.name
                            ),
                            true,
                        )
                        .field(
                            ":bookmark: Author",
                            format!("<@{}>", author.discord_id),
                            true,
                        )
                        .field("", "", true),
                ),
            )
            .await?;

        thread
            .send_message(&self.http, CreateMessage::new().content(content.as_ref()))
            .await?;

        for user in team.users.iter() {
            self.http
                .add_thread_channel_member(thread.id, UserId::from(user.1.discord_id))
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
        divisions: &BTreeMap<i64, Division>,
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

        let emoji = ["🩸", "🎉", "🔥", "🚀", "✨", "⚡", "💥", "🏹", "💉", "👏"];
        let emoji = emoji
            .choose_multiple(&mut thread_rng(), thread_rng().gen_range(1..=4))
            .cloned()
            .collect::<Vec<&str>>()
            .join(" ");

        ChannelId::from(self.settings.discord.first_blood_channel_id.ok_or(
            RhombusError::MissingConfiguration("first blood channel id".to_owned()),
        )?)
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
