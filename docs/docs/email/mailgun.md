# Mailgun Email Provider

This provider uses the [Mailgun](https://mailgun.com) API to send and receive emails.

## Mailgun Configuration

Go [here](https://help.mailgun.com/hc/en-us/articles/203380100-Where-can-I-find-my-API-keys-and-SMTP-credentials) to learn how to get your Mailgun secrets. You will need to follow the instructions for the `Domain Sending Key` and the `HTTP Webhook Signing Key`.

For receiving emails, go to `Send -> Receiving -> Create route`, and create a `Catch All` route that forwards to `https://my-rhombus-instance.example.com/mailgun`:

![Creating a route in the Mailgun dashboard](/mailgun/create.png)

Your dashboard should look like this now:

![The routes dashbaord in Mailgun with the created route](/mailgun/routes.png)

## Rhombus Configuration

To configure the Mailgun email provider, add the following to your `config.yaml`:

```yaml
email:
  mailgun:
    # (Optional, Default: https://api.mailgun.net)
    # Mailgun API endpoint to send emails to. Useful to change to EU
    # servers at https://api.eu.mailgun.net
    endpoint: https://api.mailgun.net

    # Your Mailgun domain
    domain: sandboxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.mailgun.org
```

Then, the `RHOMBUS__EMAIL__MAILGUN__API_KEY` environment variable must be set to configure the Mailgun connection with your API key. It is optional but highly recommended to also set the `RHOMBUS__EMAIL__MAILGUN__WEBHOOK_SIGNING_KEY` environment variable to verify incoming webhooks from Mailgun.
