# libsql (SQLite)

::: info
[libsql](https://github.com/tursodatabase/libsql) is a fork of SQLite by [Turso](https://turso.tech/)
:::

::: warning
This provider will make Rhombus stateful, meaning that the deployment must be a single instance, though this is usually the case for Rhombus deployments anyways.
:::

Rhombus uses libsql as its default database backend. This allows for a simple, fast, and reliable database backend that is easy to configure and maintain. It is recommended for production use.

By default, it will store the database in a file called `rhombus.db` in the current working directory. To configure the database, add the following to your `config.yaml`:

```yaml
database_url: file://myctf.db
```
