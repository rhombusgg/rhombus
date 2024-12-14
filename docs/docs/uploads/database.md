# Database Upload Provider

This provider stores files as blobs in the database.

::: warning
This provider proxies all downloads through the Rhombus server. This can be slow for large files, and is therefore not recommended for production use.
:::

To enable the database upload provider, add the following to your `config.yaml`:

```yaml
uploads:
  database: true
```
