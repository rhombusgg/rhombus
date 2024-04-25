BEGIN;

CREATE TABLE IF NOT EXISTS challenge (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    avatar TEXT NOT NULL UNIQUE,
    discord_id TEXT NOT NULL UNIQUE,
    team_id INTEGER,
    owner_team_id INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES team(id),
    FOREIGN KEY (owner_team_id) REFERENCES team(id)
);

CREATE TABLE IF NOT EXISTS email (
    email TEXT PRIMARY KEY,
    user_id INTEGER,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS team (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    invite_token TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS track (
    ip TEXT, -- 39 is the max length of an IPv6 address
    user_agent TEXT,
    last_seen_at TEXT DEFAULT CURRENT_TIMESTAMP,
    requests INT default(0),
    PRIMARY KEY (ip, user_agent)
);

CREATE TABLE IF NOT EXISTS track_connection (
    ip TEXT,
    user_agent TEXT,
    user_id BIGINT,
    last_seen_at TEXT DEFAULT CURRENT_TIMESTAMP,
    requests INT default(0),
    FOREIGN KEY (ip, user_agent) REFERENCES track(ip, user_agent),
    FOREIGN KEY (user_id) REFERENCES user(id),
    PRIMARY KEY (ip, user_agent, user_id)
);

COMMIT;
