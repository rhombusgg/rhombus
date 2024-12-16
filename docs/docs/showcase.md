# Showcase

Here are some of the best features of Rhombus in action.

## Tickets

On the challenge dashboard, users can create tickets to report issues with challenges. This is useful for authors to know what issues players are having, and to keep the conversation in one place, instead of spread across many Discord DMs.

Challenge authors can provide templates for tickets, to get higher quality issues with less back-and-forth. The template can include tailored information to the challenge, such as common questions received, or hints. Users then fill out the template, with full support for markdown, and submit the ticket.

![Ticket creation](/showcase/ticket-create.png)

Once the ticket is submitted, a thread is created off of a configured channel in your Discord server. The author and the user are joined to the thread, and can continue the conversation there. Then anyone in the thread can add different authors and admins, or different team members to the ticket by just `@` mentioning them.

![Ticket response](/showcase/ticket-response.png)

Anyone can close the ticket by clicking the Close Ticket button, which will archive the ticket. It can be reopened by anymore, or reviewed later as a normal Discord thread.

The ticket will also be closed automatically if the user solves the challenge.

![Ticket closed after the user solves the challenge](/showcase/ticket-close-solved.png)

### Email Bridge

For users who do not have Discord, they can still interact with the ticket system by replying to the email they receive when a ticket is created. The email will be sent to the Discord thread, and the user will receive further messages as the conversation continues.

User replies will appear as a message sent from the Rhombus bot with attribution to the email "from" address in the Discord thread.

![Rhombus showing an email received](/showcase/ticket-email-reply.png)

The user will get a digest of the ticket conversation in their email, so they can keep up with the conversation without needing Discord.

![Email client showing ticket digest](/showcase/ticket-email-digest.png)

## Discord

Rhombus has deep integration with Discord, including the [ticket system](#tickets) seen above, and [OAuth2](/docs/auth#discord-recommended) sign in. Here are some more features of the Discord integration:

### First bloods

When a user is the first in their division to solve a challenge, the Rhombus Discord bot will send a message in a configured first blood channel.

![First blood](/showcase/first-blood.png)

It will also DM the author of the challenge, so they know someone solved their challenge.

![Direct message to author](/showcase/dm.png)

### User Lookup

Anyone can execute the `/whois` command in Discord to get CTF information about a user and their team. If an admin executed it, it will also say their country, current local time, the last time they were on the CTF site, and their IP address.

![Whois of mbund](/showcase/whois.png)

### Roles

When a user signs in or links their account with Discord, they will be assigned a role to indicate they have been verified. Additionally, they can get a role based on the [division](/docs/divisions) they are in.

![mbunk's user profile show roles](/showcase/roles.png){width=400px}

## CTFtime

Rhombus implements the [CTFtime Json Scoreboard Feed](https://ctftime.org/json-scoreboard-feed) and updates it live as the competition progresses. This is useful to easily export at the end of the competition, and to show the current standings to participants during it. No additional configuration is required to enable this feature.

To use it, just append `/ctftime.json` to the URL of the currently scoreboard. For example, this could be `https://myctf.example.com/scoreboard/open/ctftime.json` or `https://myctf.example.com/scoreboard/undergraduate/ctftime.json`. Note that only one [division](/docs/divisions) may be active and polled by CTFtime at a time. Then, configure your event on CTFtime with the link.

![CTFtime scoreboard feed](/showcase/ctftime-scoreboard-feed.png)

If you're curious, the format looks like this (with real data from BuckeyeCTF 2024):

```json
{
  "standings": [
    { "pos": 1, "score": 7938, "team": ".;,;." },
    { "pos": 2, "score": 6940, "team": "no rev/pwn no life" },
    { "pos": 3, "score": 6940, "team": "GreyHat" },
    { "pos": 4, "score": 6470, "team": "L3ak" },
    { "pos": 5, "score": 5646, "team": "UMDCSEC" },
    { "pos": 6, "score": 5494, "team": "sigpwny" },
    { "pos": 7, "score": 5471, "team": "b01lers" },
    { "pos": 8, "score": 5471, "team": "UofTCTF" },
    { "pos": 9, "score": 5070, "team": "Psi Beta Rho | UCLA" },
    { "pos": 10, "score": 4725, "team": "CyberSpace" },
    { "pos": 11, "score": 4510, "team": "PPP" },
    { "pos": 12, "score": 4439, "team": "negasora" },
    { "pos": 13, "score": 4348, "team": "poteti fan club" }
    // ...
  ],
  "tasks": [
    "gentleman",
    "hashbrown",
    "instructions",
    "fixpoint",
    "couch potato",
    "dojo",
    "sailing_the_c",
    "Gent's Favorite Model",
    "runway3",
    "duck-pics",
    "donuts",
    "spaceman",
    "zkwarmup",
    "quotes",
    "Free C Compiler (Online)",
    "text-adventure",
    "flagwatch",
    "D.I.S.A.",
    "homecooked",
    "sanity"
    // ...
  ]
}
```

## Health Checks

Challenges can be configured to have health checks. They are written in [healthscript](https://github.com/rhombusgg/healthscript), a DSL for health checks. Health checks are run periodically to ensure the challenge is still up and working as expected. If the health check fails, the challenge will be marked as down, signaling to players that the admins know the challenge is having issues.

The simplest healthscript is just an http url. It will check if the response code is `200` and is useful for web challenges.

```
https://example.com
```

![healthcheck example](https://healthscript.mbund.dev/https://example.com)

Another simple kind of health check is a tcp check. It will check if the connection is successful, and that the first bytes match the given pattern. It is useful for pwn challenges.

```
tcp://pwn.osucyber.club:13389 <"cheese">
```

![healthcheck example](https://healthscript.mbund.dev/tcp://pwn.osucyber.club:13389%20<"cheese">)

The health checks show up on the challenges page, next to the challenge in question.

![healthcheck example](/showcase/healthcheck.png)

## Social Cards

Rhombus automatically generates social cards and shows them when a link to a challenge is shared on social media (Twitter, Discord, Facebook, etc). This is useful to attract more participants to your CTF.

Here are some examples from BuckeyeCTF 2024:

### Main Social Card

The default social card for the CTF which is shown on most pages. It includes the following information:

- CTF name
- Description
- Logo
- Site url
- Start time
- End time
- Who hosts it
- The number of players currently signed up
- The number of teams currently signed up
- The total number of challenges
- At the bottom, the distribution of challenges by category
- Total number of solves (if CTF has started)
- CTFtime weight (if CTFtime id has been linked)
- If the CTF is over, it will show the final scoreboard in each division in the middle

![BuckeyeCTF 2024 main social card](/showcase/bctf24-social-card.png)

### Team Social Card

In addition to the "standard" attributes of the main card, the Team card shows:

- Team name
- Players on the team
- Division the team is in, and their standing (if the CTF has started)
- The number of players on the team
- The number of solves the team has
- At the bottom, the distribution of challenges by category that the team has solved

![BuckeyeCTF 2024 team sigpwny's social card](/showcase/sigpwny.png)

### User Social Card

In addition to the "standard" attributes of the main card, the User card shows:

- User name
- Team name that the user is on
- Number of solves the user has
- At the bottom, the distribution of challenges by category that the user has solved

In this example however, the player has not solved any challenges yet, so it defaults to all black.

![BuckeyeCTF 2024 user mbund's social card](/showcase/mbund.png)

## Writeups

When a team has solved a challenge, the flag submission turns into a writeup submission.

![Writeup submission](/showcase/writeup.png)

Admins can later review the writeups to see how people solved the challenge.

## Archive

::: warning 🚧 COMING SOON 🚧
Static site archival mode
:::

## Audit Log

::: warning 🚧 COMING SOON 🚧
Log of common events like user creation, challenge solves, etc.
:::
