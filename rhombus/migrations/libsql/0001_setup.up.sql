PRAGMA journal_mode=WAL;

BEGIN;

CREATE TABLE IF NOT EXISTS rhombus_challenge (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    flag TEXT NOT NULL,
    category_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    ticket_template TEXT,
    healthscript TEXT,
    healthy INTEGER, -- 0 or 1
    last_healthcheck INTEGER,
    score_type TEXT NOT NULL,
    metadata TEXT,
    points INTEGER,
    FOREIGN KEY (category_id) REFERENCES rhombus_category(id),
    FOREIGN KEY (author_id) REFERENCES rhombus_author(id)
);

CREATE TABLE IF NOT EXISTS rhombus_file_attachment (
    challenge_id TEXT NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    hash TEXT,
    PRIMARY KEY (challenge_id, url),
    FOREIGN KEY (challenge_id) REFERENCES rhombus_challenge(id)
);

CREATE TABLE IF NOT EXISTS rhombus_file (
    hash TEXT NOT NULL UNIQUE,
    filename TEXT NOT NULL,
    contents BLOB NOT NULL,
    PRIMARY KEY (hash)
);

CREATE TABLE IF NOT EXISTS rhombus_division (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    is_default INTEGER NOT NULL DEFAULT(FALSE) -- 0 or 1
);

CREATE TABLE IF NOT EXISTS rhombus_author (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    avatar TEXT NOT NULL,
    discord_id INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS rhombus_points_snapshot (
    team_id INTEGER NOT NULL,
    at INTEGER NOT NULL DEFAULT(strftime('%s', 'now')),
    points INTEGER NOT NULL,
    PRIMARY KEY (team_id, at ASC),
    FOREIGN KEY (team_id) REFERENCES rhombus_team(id)
);

CREATE TABLE IF NOT EXISTS rhombus_category (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    sequence INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS rhombus_solve (
    challenge_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    solved_at INTEGER NOT NULL DEFAULT(strftime('%s', 'now')),
    points INTEGER,
    PRIMARY KEY (team_id, challenge_id),
    FOREIGN KEY (challenge_id) REFERENCES rhombus_challenge(id),
    FOREIGN KEY (user_id) REFERENCES rhombus_user(id),
    FOREIGN KEY (team_id) REFERENCES rhombus_team(id)
);

CREATE INDEX IF NOT EXISTS challenge_id_idx ON rhombus_solve(challenge_id, team_id, points);

CREATE TABLE IF NOT EXISTS rhombus_user (
    id INTEGER PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    avatar TEXT NOT NULL,
    discord_id INTEGER UNIQUE,
    ctftime_id INTEGER UNIQUE,
    password TEXT,
    team_id INTEGER NOT NULL,
    owner_team_id INTEGER NOT NULL,
    disabled INTEGER NOT NULL DEFAULT(FALSE), -- 0 or 1
    is_admin INTEGER NOT NULL DEFAULT(FALSE), -- 0 or 1
    api_key TEXT NOT NULL,
    FOREIGN KEY (team_id) REFERENCES rhombus_team(id),
    FOREIGN KEY (owner_team_id) REFERENCES rhombus_team(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS team_id_idx ON rhombus_user(team_id);
CREATE INDEX IF NOT EXISTS api_key_idx ON rhombus_user(api_key);

CREATE TABLE IF NOT EXISTS rhombus_user_historical_names (
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    at INTEGER NOT NULL DEFAULT(strftime('%s', 'now')),
    PRIMARY KEY (user_id, name, at),
    FOREIGN KEY (user_id) REFERENCES rhombus_user(id)
);

CREATE TABLE IF NOT EXISTS rhombus_email (
    email TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    code TEXT UNIQUE,
    PRIMARY KEY (email, user_id),
    FOREIGN KEY (user_id) REFERENCES rhombus_user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rhombus_email_signin (
    email TEXT NOT NULL,
    code TEXT UNIQUE,
    expires INTEGER NOT NULL DEFAULT(strftime('%s', 'now', '+10 minutes')),
    PRIMARY KEY (email)
);

CREATE TRIGGER IF NOT EXISTS rhombus_email_signin_autodelete
    BEFORE INSERT ON rhombus_email_signin
BEGIN
    DELETE FROM rhombus_email_signin
    WHERE expires < strftime('%s', 'now');
END;

CREATE TABLE IF NOT EXISTS rhombus_writeup (
    user_id INTEGER NOT NULL,
    challenge_id TEXT NOT NULL,
    url TEXT NOT NULL,
    PRIMARY KEY (user_id, challenge_id),
    FOREIGN KEY (user_id) REFERENCES rhombus_user(id),
    FOREIGN KEY (challenge_id) REFERENCES rhombus_challenge(id)
);

CREATE TABLE IF NOT EXISTS rhombus_team (
    id INTEGER PRIMARY KEY NOT NULL,
    name TEXT NOT NULL UNIQUE,
    invite_token TEXT NOT NULL,
    ctftime_id INTEGER UNIQUE,
    division_id TEXT NOT NULL,
    last_division_change INTEGER,
    points INTEGER NOT NULL DEFAULT(0),
    last_solved_at INTEGER NOT NULL DEFAULT(0),
    FOREIGN KEY (division_id) REFERENCES rhombus_division(id)
);

CREATE INDEX IF NOT EXISTS invite_token_idx ON rhombus_team(invite_token);
CREATE INDEX IF NOT EXISTS ctftime_id_idx ON rhombus_team(ctftime_id);
CREATE INDEX IF NOT EXISTS leaderboard_idx ON rhombus_team(division_id, points DESC, last_solved_at ASC);

CREATE TABLE IF NOT EXISTS rhombus_team_historical_names (
    team_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    at INTEGER NOT NULL DEFAULT(strftime('%s', 'now')),
    PRIMARY KEY (team_id, name, at),
    FOREIGN KEY (team_id) REFERENCES rhombus_team(id)
);

CREATE TABLE IF NOT EXISTS rhombus_ticket (
    ticket_number INTEGER NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    challenge_id TEXT NOT NULL,
    opened_at INTEGER NOT NULL DEFAULT(strftime('%s', 'now')),
    closed_at INTEGER,
    discord_channel_id INTEGER NOT NULL UNIQUE,
    discord_panel_message_id INTEGER NOT NULL UNIQUE,
    discord_last_message_id INTEGER,
    PRIMARY KEY (ticket_number),
    FOREIGN KEY (user_id) REFERENCES rhombus_user(id),
    FOREIGN KEY (challenge_id) REFERENCES rhombus_challenge(id)
);

CREATE TABLE IF NOT EXISTS rhombus_ticket_email_message_id_reference (
    message_id TEXT NOT NULL,
    ticket_number INTEGER NOT NULL,
    user_sent INTEGER NOT NULL DEFAULT(FALSE), -- 0 or 1
    PRIMARY KEY (message_id),
    FOREIGN KEY (ticket_number) REFERENCES rhombus_ticket(ticket_number)
);

CREATE TABLE IF NOT EXISTS rhombus_ticket_number_counter (
    ticket_number INTEGER NOT NULL
);

INSERT OR IGNORE INTO rhombus_ticket_number_counter (ticket_number) VALUES (0);

CREATE TABLE IF NOT EXISTS rhombus_config (
    id INTEGER PRIMARY KEY NOT NULL,
    config TEXT
);

CREATE TABLE IF NOT EXISTS rhombus_challenge_division_solves (
    challenge_id TEXT NOT NULL,
    division_id TEXT NOT NULL,
    solves INTEGER NOT NULL,
    PRIMARY KEY (challenge_id, division_id),
    FOREIGN KEY (challenge_id) REFERENCES rhombus_challenge(id),
    FOREIGN KEY (division_id) REFERENCES rhombus_division(id)
);

CREATE TRIGGER IF NOT EXISTS update_challenge_division_solves_division_change
AFTER UPDATE OF division_id ON rhombus_team
WHEN OLD.division_id != NEW.division_id
BEGIN
    INSERT OR IGNORE INTO rhombus_challenge_division_solves (challenge_id, division_id, solves)
    SELECT id, NEW.division_id, 0
    FROM rhombus_challenge;

    UPDATE rhombus_challenge_division_solves
    SET solves = CASE WHEN division_id = OLD.division_id THEN solves - 1 ELSE solves + 1 END
    WHERE division_id in (OLD.division_id, NEW.division_id) AND challenge_id IN (
        SELECT challenge_id
        FROM rhombus_solve
        WHERE team_id = NEW.id
    );
END;

CREATE TABLE IF NOT EXISTS rhombus_track (
    id INTEGER PRIMARY KEY NOT NULL,
    ip BLOB NOT NULL,
    user_agent TEXT NOT NULL,
    last_seen_at INTEGER NOT NULL DEFAULT(strftime('%s', 'now')),
    requests INTEGER NOT NULL,
    UNIQUE(ip, user_agent)
);

CREATE UNIQUE INDEX IF NOT EXISTS rhombus_track_ip_user_agent ON rhombus_track(ip, user_agent);

CREATE TABLE IF NOT EXISTS rhombus_track_ip (
    user_id INTEGER NOT NULL,
    track_id INTEGER NOT NULL,
    PRIMARY KEY (user_id, track_id),
    FOREIGN KEY (track_id) REFERENCES rhombus_track(id) ON DELETE CASCADE
);

-- Enforce a maximum number of `user_agent`s per ip, to make it less trivial for someone
-- to fill up our db by simply spamming us with requests from different user agents
CREATE TRIGGER IF NOT EXISTS rhombus_track_autodelete
    AFTER INSERT ON rhombus_track
BEGIN
    DELETE FROM rhombus_track
    WHERE rowid = (
        SELECT rowid
        FROM rhombus_track
        WHERE ip = NEW.ip AND rowid != NEW.rowid
        ORDER BY requests DESC
        LIMIT 1 OFFSET 31
    );
END;

COMMIT;
