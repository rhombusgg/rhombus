BEGIN;

CREATE TABLE IF NOT EXISTS rhombus_challenge (
    id INTEGER PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rhombus_solve (
    challenge_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    solved_at INTEGER NOT NULL DEFAULT(strftime('%s', 'now')),
    PRIMARY KEY (challenge_id, user_id)
);

CREATE TABLE IF NOT EXISTS rhombus_user (
    id INTEGER PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    avatar TEXT NOT NULL UNIQUE,
    discord_id TEXT NOT NULL UNIQUE,
    team_id INTEGER NOT NULL,
    owner_team_id INTEGER NOT NULL,
    disabled BOOLEAN NOT NULL DEFAULT(FALSE),
    is_admin BOOLEAN NOT NULL DEFAULT(FALSE),
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
    name TEXT NOT NULL UNIQUE,
    invite_token TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rhombus_track (
    id INTEGER PRIMARY KEY NOT NULL,
    ip BLOB NOT NULL,
    user_agent TEXT NOT NULL,
    last_seen_at INTEGER NOT NULL DEFAULT(strftime('%s', 'now')),
    requests INTEGER NOT NULL DEFAULT(1),
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
