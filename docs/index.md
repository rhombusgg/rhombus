---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: Rhombus ◈
  text: The CTF framework for busy hackers
  tagline: Extensible, lightweight, and feature-rich platform that lets you focus on challenges, not infrastructure.
  actions:
    - theme: brand
      text: Get Started
      link: /docs/getting-started
    - theme: alt
      text: Live Demo
      link: https://demo.rhombus.gg
  image:
    src: /logo.svg
    alt: VitePress

features:
  - title: Host Anywhere
    icon: ☁
    details: As a single static binary, Rhombus runs on any cloud, in stateful VMs, ephemeral containers, or on a Raspberry Pi. Then choose from multiple options for databases, file uploads, and email.
    link: /docs/deploy
  - title: Batteries Included
    icon: 🔋
    details: Deeply integrated with Discord, CTFtime, and more to meet your players where they are. Get started with the defaults and incrementally add in features with simple configuration.
    link: /docs/concepts
  - title: Ticket System
    icon: 🎟
    details: Let users report problems with challenges and continue the conversation in Discord. Authors can provide templates to get higher quality issues with less back-and-forth.
    link: /docs/concepts/tickets
  - title: Open Source
    icon: 📦
    details: Complete transparency and control over your platform. Contribute new features and bug fixes, or fork and maintain your own version.
    link: https://github.com/rhombusgg/rhombus
  - title: Extendable
    icon: 🔌
    details: Create powerful plugins in Rust to implement custom functionality, and easily share it with others.
    link: /docs/plugins
  - title: Scalable
    icon: ⧉
    details: Serve 1000s of req/s on a single core and less than 100MB RAM. Give Rhombus more CPU and saturate your network bandwidth.
    link: /docs/deploy
---

<style>
:root {
  --vp-home-hero-image-background-image: linear-gradient(-45deg, #dc262677 50%, #dc262677 50%);
  --vp-home-hero-image-filter: blur(44px);
}

.VPImage.image-src {
  height: 100%;
}


@media (min-width: 640px) {
  :root {
    --vp-home-hero-image-filter: blur(56px);
  }
}

@media (min-width: 960px) {
  :root {
    --vp-home-hero-image-filter: blur(68px);
  }
}
</style>
