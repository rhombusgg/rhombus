# Discord Integration

Rhombus integrates with Discord to provide a seamless experience for players and authors. See the [Discord Showcase](/docs/showcase#discord) for more information on the features of the Discord integration.

::: warning
This provider will make Rhombus stateful, meaning that the deployment must be a single instance, though this is usually the case for Rhombus deployments anyways.
:::

## Discord Configuration

The discord features require a Discord Bot to be created. You will create the bot and join it to your server.

Go to the [Discord Developer Portal](https://discord.com/developers/applications) and create a new application (or use an existing one). Customize it as you see fit, with an app icon, name, and description.

Go to the Bot tab and reset the bot token. Make sure to copy the token, as you will not be able to see it again. Then go to Privileged Gateway Intents and enable the `Server Members Intent` and `Message Content Intent`.

Then go to the OAuth2 tab and scroll to the `OAuth2 URL Generator`. Enable the `bot` scope. Then enable the following permissions:

- `Manage Roles`
- `Send Messages`

The final permissions integer should be `268437504`.

Make sure that `Integration Type` is set to `Guild Install`.

The `Generate URL` should look like this:

```
https://discord.com/oauth2/authorize?client_id=<your client id>&permissions=268437504&integration_type=0&scope=bot
```

Then, follow that generated URL to add the bot to your server. When the bot is added, a new role will be automatically created with the same name as the bot. Make sure that the role is above the roles you want to manage, and that it has access to the channel that you want the bot to have access to.

## Rhombus Configuration

```yaml
discord:
  # Discord ID of guild (server) where the bot is installed
  guild_id: 12345678901234567890

  # Discord Client ID of the OAuth2 application
  client_id: 12345678901234567890

  # Discord ID for the author role to link authors to
  author_role_id: 12345678901234567890

  # Discord ID for the channel which first bloods should be sent
  # to. If not provided, first bloods will not be sent.
  first_blood_channel_id: 12345678901234567890

  # Discord ID for the channel which support threads should be
  # branched off of. If not provided, tickets will not be created.
  support_channel_id: 12345678901234567890

  # Discord ID for the verified role to give to users who sign in
  # to the CTF website
  verified_role_id: 12345678901234567890

  # Discord ID for the role to give to the players in the top 10
  # teams in each division
  top10_role_id: 12345678901234567890

  # A discord guild invite url. If not provided, and the Discord
  # Bot has been configured, the bot will generate an invite link
  invite_url: https://discord.gg/E2CcvJxq

  # Whether to automatically join the discord server when signing up.
  # Requires the "Join servers for you" OAuth permission. Defaults to `true`
  autojoin: false

  # Secret Discord Bot Token
  bot_token:

  # Secret Discord Client Secret for OAuth2
  client_secret:
```

It is recommended that you set `bot_token` and `client_secret` with their environment variables `RHOMBUS__DISCORD__BOT_TOKEN` and `RHOMBUS__DISCORD__CLIENT_SECRET` respectively.

## Generative AI

This feature exists not because it is useful, but because it is funny. For example, if an author does not feel like creating a response to a ticket, or if the person creating the ticket clearly used AI, then the author can use AI to generate a response.

The AI will receive the context of all previous tickets opened for the challenge before, and the previous messages in the current ticket. It will then generate a response based on that context. It produces results that are...fine...sometimes?

The author simply uses the `/ai` command in the ticket to generate a suggested response.

![AI](/discord/ai.png)

The author can then copy the response and send it as themselves to ensure that prompt injection never reveals anything secret.

![AI prompt injection](/discord/ai-prompt-injection.png)

To configure, set the `RHOMBUS__OPENAI_API_KEY` environment variable to your OpenAI API key.
