import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Rhombus",
  description: "The CTF framework for busy hackers",
  head: [
    ["link", { rel: "icon", href: "/logo.svg" }],
    [
      "script",
      {
        defer: "",
        "data-domain": "rhombus.gg",
        src: "https://plausible.mbund.org/js/script.js",
      },
    ],
  ],
  lastUpdated: true,
  cleanUrls: true,
  themeConfig: {
    logo: "/logo.svg",

    nav: [
      {
        text: "Documentation",
        link: "/docs/getting-started",
        activeMatch: "/docs/",
      },
      {
        text: "Plugin API Documentation",
        link: "https://docs.rs/rhombus",
      },
      { text: "Demo", link: "https://demo.rhombus.gg", rel: "external" },
    ],

    sidebar: [
      {
        text: "Introduction",
        items: [
          { text: "Getting Started", link: "/docs/getting-started" },
          { text: "Deploy", link: "/docs/deploy" },
          {
            text: "Concepts",
            link: "/docs/concepts/",
            items: [
              { text: "Tickets", link: "/docs/concepts/tickets" },
              { text: "Health Checks", link: "/docs/concepts/healthchecks" },
              { text: "CTFtime", link: "/docs/concepts/ctftime" },
            ],
          },
        ],
      },
      {
        text: "Configuration",
        items: [
          { text: "Discord", link: "/docs/discord" },
          { text: "Authentication", link: "/docs/auth" },
          { text: "Divisions", link: "/docs/divisions" },
          { text: "Challenges", link: "/docs/challenges" },
          { text: "CTFtime", link: "/docs/ctftime" },
          {
            text: "Email",
            link: "/docs/email/",
            items: [
              { text: "SMTP", link: "/docs/email/smtp" },
              { text: "IMAP", link: "/docs/email/imap" },
              { text: "Mailgun", link: "/docs/email/mailgun" },
            ],
          },
          {
            text: "Database",
            link: "/docs/database/",
            items: [
              { text: "libSQL (SQLite)", link: "/docs/database/libsql" },
              { text: "Postgres", link: "/docs/database/postgres" },
            ],
          },
          {
            text: "Uploads",
            link: "/docs/uploads/",
            items: [
              { text: "Local", link: "/docs/uploads/local" },
              { text: "Database", link: "/docs/uploads/database" },
              { text: "S3", link: "/docs/uploads/s3" },
            ],
          },
          { text: "IP Extractor", link: "/docs/ip" },
          { text: "Rate Limiting", link: "/docs/rate-limit" },
        ],
      },
      {
        text: "Plugins",
        items: [
          { text: "Writing a Plugin", link: "/docs/plugins/" },
          { text: "Demo Instance Walkthrough", link: "/docs/plugins/demo" },
        ],
      },
    ],

    search: {
      provider: "local",
    },

    footer: {
      message:
        'Released under the <a href="https://github.com/rhombusgg/rhombus/blob/main/LICENSE">MPL-2.0 License</a>.',
      copyright:
        'Copyright © 2024-present <a href="https://github.com/mbund">Mark Bundschuh</a>',
    },

    editLink: {
      pattern: "https://github.com/rhombusgg/rhombus/edit/main/docs/:path",
      text: "Edit this page on GitHub",
    },

    socialLinks: [
      { icon: "github", link: "https://github.com/rhombusgg/rhombus" },
      { icon: "discord", link: "https://discord.gg/ZMgXeHYZaz" },
    ],
  },
});
