# Authentication

Rhombus supports many different authentication methods to suit your needs. At least one must be selected, but many can be enabled at once.

To configure authentication, add the following to your `config.yaml`:

```yaml
auth:
  - discord
  - email
  - ctftime
  - credentials
```

The `auth` key is a list, and each item in the list is a different authentication method. The order of the list determines the order in which the methods are presented to the user in the login form. There cannot be duplicates in the list. See below for more information on each method, as some require additional configuration.

![Sign in form with all options](/auth/sign-in-all.png)

## Discord (recommended)

Most CTFs have a corresponding Discord server, and this allows automatic linking between their Discord account and their CTF account. [Learn more about Discord integration](/docs/discord).

### Discord Configuration

Go the the [Discord developer dashboard](https://discord.com/developers) and go to your Application (or make one if you haven't already). Go to the OAuth2 tab in the sidebar. Copy your Client ID, and reset your Client Secret if you haven't already, copying it to set as an environment variable later.

Then, add a redirect URL with the format:

```
https://your-ctf.example.com/signin/discord/callback
```

You probably also want to add a callback to localhost for local development:

```
http://localhost:3000/signin/discord/callback
```

### Rhombus Configuration

To configure Discord authentication, add the following to your `config.yaml`:

```yaml
discord:
  client_id: # your discord OAuth Client ID
```

Then, the `RHOMBUS__DISCORD__CLIENT_SECRET` environment variable should be configured with your Discord OAuth Client Secret. If you want the Client ID to be hidden to, you can use the `RHOMBUS__DISCORD__CLIENT_ID` environment variable instead of the `yaml` configuration file.

![Discord oauth form](/auth/discord-oauth.png)

![Discord sign in form](/auth/sign-in-discord.png)

## Email

The email authentication method allows users to sign in with a [magic link](https://clerk.com/blog/magic-links). It is the recommended option for players who do not have a Discord account.

An email sending provider must be configured. [Learn more about email configuration](/docs/email/).

![Email sign in form](/auth/sign-in-email.png)

## CTFtime

The CTFtime authentication method allows users to sign in with their CTFtime account. It will automatically join players together on the same team in the CTF as on CTFtime.

### CTFtime Configuration

Edit your CTFtime event and scroll to find the OAuth Client ID and OAuth Client Secret. Copy these values to set as environment variables later.

::: info
The OAuth Client ID is the same value as the CTFtime event ID. The OAuth Client Secret is a long hex string which should be kept secret.
:::

### Rhombus Configuration

To configure CTFtime authentication, add the following to your `config.yaml`:

```yaml
ctftime:
  client_id: # your CTFtime OAuth Client ID
```

Then, the `RHOMBUS__CTFTIME__CLIENT_SECRET` environment variable should be configured with your CTFtime OAuth Client Secret. If you want the Client ID to be hidden to, you can use the `RHOMBUS__CTFTIME__CLIENT_ID` environment variable instead of the `yaml` configuration file.

![CTFtime oauth form](/auth/ctftime-oauth.png)

![CTFtime sign in form](/auth/sign-in-ctftime.png)

## Credentials

When this method is enabled, users can log in with any username and password.

This is the easiest method to set up because it requires no additional configuration, but it is not recommended for production use. It is useful for testing or for small private CTFs.

![Credentials sign in form](/auth/sign-in-credentials.png)
