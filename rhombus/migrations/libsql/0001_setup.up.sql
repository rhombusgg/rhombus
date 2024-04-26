BEGIN;

CREATE TABLE IF NOT EXISTS rhombus_challenge (
    id INTEGER PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rhombus_user (
    id INTEGER PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    avatar TEXT NOT NULL UNIQUE,
    discord_id TEXT NOT NULL UNIQUE,
    team_id INTEGER NOT NULL,
    owner_team_id INTEGER NOT NULL,
    FOREIGN KEY (team_id) REFERENCES rhombus_team(id),
    FOREIGN KEY (owner_team_id) REFERENCES rhombus_team(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rhombus_email (
    email TEXT PRIMARY KEY NOT NULL,
    user_id INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES rhombus_user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rhombus_team (
    id INTEGER PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    invite_token TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rhombus_track (
    ip TEXT NOT NULL, -- 39 is the max length of an IPv6 address
    user_agent TEXT NOT NULL,
    last_seen_at INTEGER(4) NOT NULL DEFAULT(strftime('%s', 'now')),
    requests INTEGER NOT NULL DEFAULT(1),
    user_id INTEGER,
    FOREIGN KEY (user_id) REFERENCES rhombus_user(id),
    PRIMARY KEY (ip, user_agent)
);

COMMIT;
