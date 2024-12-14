# SMTP Email Provider

This provider uses the [SMTP](https://en.wikipedia.org/wiki/Simple_Mail_Transfer_Protocol) protocol to send emails. It is the most common way to send emails and is supported by most email providers.

::: warning
This requires that Rhombus was built with the `smtp` feature flag enabled.
:::

To configure the SMTP email provider, add the following to your `config.yaml`:

```yaml
email:
  from: My CTF <no-reply@example.com>
```

Then, use the `RHOMBUS__EMAIL__SMTP_CONNECTION_URL` environment variable to configure the SMTP connection with your secrets. The specification for the connection url can be found [here](https://docs.rs/lettre/latest/lettre/transport/smtp/struct.AsyncSmtpTransport.html#method.from_url).

For example:

```
smtps://username:password@smtp.example.com/client.example.com:465
```

Will use SMTP over TLS, with username `username` and password `password`, connecting to `smtp.example.com` on port `465`, and setting the HELO / EHLO name to `client.example.com`.
