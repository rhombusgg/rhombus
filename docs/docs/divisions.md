# Divisions

Divisions are used to segregate teams into different scoreboards. If no divisions are specified, a single default "Open" division is created.

Divisions have the following properties:

- `name` (required): The name of the division
- `description` (required): A description of the division
- `email_regex` (optional): A regex pattern that the user's email must match to join this division
- `requirement` (optional): A description of the requirement to join this division
- `max_players` (optional): The maximum number of players that can be on a team in this division. If not specified, or set to `unlimited`, there is no limit
- `discord_role_id` (optional): The Discord role ID that will be assigned to users in this division

Here is an example configuration with multiple divisions:

```yaml
divisions:
  - name: Open
    description: Open division for everyone
    discord_role_id: 1297614892563435540
  - name: Undergraduate
    description: Undergraduate university students globally
    email_regex: ^.*.edu$
    requirement: Must verify a valid university .edu email address
    discord_role_id: 1297614961941680239
  - name: OSU
    description: OSU undergraduate students
    email_regex: ^.*\.\d+@(buckeyemail\.)?osu\.edu$
    requirement: Must verify a valid OSU email address. Max of up to 4 players
    max_players: 4
    discord_role_id: 1297615021773295709
```
