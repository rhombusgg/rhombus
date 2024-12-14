# IMAP Email Provider

This provider uses the [IMAP](https://en.wikipedia.org/wiki/Internet_Message_Access_Protocol) protocol to receive emails. It is used by the [ticket system](/docs/showcase#tickets) to receive emails from users who have not signed in with Discord.

::: warning
This requires that Rhombus was built with the `imap` feature flag enabled.
:::

::: warning
This will read unread emails from the inbox and mark them as read. It is recommended to use a dedicated email account for this purpose.
:::

::: warning
This provider will make Rhombus stateful, meaning that the deployment must be a single instance, though this is usually the case for Rhombus deployments anyways.
:::

To configure the IMAP email provider, add the following to your `config.yaml`. Any of these fields can be made secret by switching them to their environment variable versions:

```yaml
email:
  imap:
    domain: imap.example.com
    username: myusername
    inbox: inbox

    # Your IMAP server's port
    port: 993

    # (Optional) Override default auto detection of IDLE command to receive
    # emails in real time
    idle: true

    # (Optional) Interval in seconds to poll the inbox for new emails when
    # IDLE is not supported
    poll_interval: 60
```

Then, set the `RHOMBUS__EMAIL__IMAP__PASSWORD` environment variable to configure the IMAP connection with your password.
