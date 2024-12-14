# Local Upload Provider

This provider uses files on the local filesystem to store uploads. It is the default provider if no other provider is specified, and requires no configuration.

::: warning
This provider proxies all downloads through the Rhombus server. This can be slow for large files, and is therefore not recommended for production use.
:::

The provider can optionally be configured to change where it stores files. To configure the local upload provider, add the following to your `config.yaml`:

```yaml
uploads:
  local:
    folder: my-path-to-uploads
```
