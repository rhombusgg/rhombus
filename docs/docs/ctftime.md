# CTFtime

CTFtime is mostly an authentication method, which you can learn how to configure [here](/docs/auth#ctftime). However, as shown in the [showcase](/docs/showcase#social-cards), the CTFtime weight can be displayed in the social image even if CTFtime authentication is not enabled. This requires setting the `client_id` in the `ctftime` section of the `config.yaml`. The `client_secret` is not required for this feature.

```yaml
ctftime:
  client_id: # your CTFtime OAuth Client ID
```
