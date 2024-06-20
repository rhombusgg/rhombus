BEGIN;

CREATE TABLE IF NOT EXISTS rhombus_challenge (
    id INTEGER PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    flag TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    healthy BOOLEAN NOT NULL DEFAULT(TRUE),
    author_id INTEGER NOT NULL,
    ticket_template TEXT,
    score_type INTEGER NOT NULL,
    static_points INTEGER,
    FOREIGN KEY (category_id) REFERENCES rhombus_category(id),
    FOREIGN KEY (author_id) REFERENCES rhombus_author(id)
);

CREATE TABLE IF NOT EXISTS rhombus_file_attachment (
    challenge_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    PRIMARY KEY (challenge_id, url),
    FOREIGN KEY (challenge_id) REFERENCES rhombus_challenge(id)
);

CREATE TABLE IF NOT EXISTS rhombus_division (
    id INTEGER PRIMARY KEY NOT NULL,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rhombus_author (
    id INTEGER PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    avatar TEXT NOT NULL,
    discord_id INTEGER NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS rhombus_points_snapshot (
    team_id INTEGER NOT NULL,
    division_id INTEGER NOT NULL,
    at INTEGER NOT NULL DEFAULT(strftime('%s', 'now')),
    points INTEGER NOT NULL,
    PRIMARY KEY (team_id, division_id, at),
    FOREIGN KEY (team_id) REFERENCES rhombus_team(id),
    FOREIGN KEY (division_id) REFERENCES rhombus_division(id)
);

CREATE TABLE IF NOT EXISTS rhombus_category (
    id INTEGER PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rhombus_solve (
    challenge_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    solved_at INTEGER NOT NULL DEFAULT(strftime('%s', 'now')),
    PRIMARY KEY (challenge_id, user_id),
    FOREIGN KEY (challenge_id) REFERENCES rhombus_challenge(id),
    FOREIGN KEY (user_id) REFERENCES rhombus_user(id)
);

CREATE TABLE IF NOT EXISTS rhombus_user (
    id INTEGER PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    avatar TEXT NOT NULL,
    discord_id INTEGER,
    team_id INTEGER NOT NULL,
    owner_team_id INTEGER NOT NULL,
    disabled BOOLEAN NOT NULL DEFAULT(FALSE),
    is_admin BOOLEAN NOT NULL DEFAULT(FALSE),
    FOREIGN KEY (team_id) REFERENCES rhombus_team(id),
    FOREIGN KEY (owner_team_id) REFERENCES rhombus_team(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rhombus_user_division (
    user_id INTEGER NOT NULL,
    division_id INTEGER NOT NULL,
    PRIMARY KEY (user_id, division_id),
    FOREIGN KEY (user_id) REFERENCES rhombus_user(id),
    FOREIGN KEY (division_id) REFERENCES rhombus_division(id)
);

CREATE TABLE IF NOT EXISTS rhombus_email (
    email TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    code TEXT UNIQUE,
    PRIMARY KEY (email, user_id),
    FOREIGN KEY (user_id) REFERENCES rhombus_user(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rhombus_email_signin (
    email TEXT NOT NULL,
    code TEXT UNIQUE,
    expires INTEGER NOT NULL DEFAULT(strftime('%s', 'now', '+1 hour')),
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
    challenge_id INTEGER NOT NULL,
    url TEXT NOT NULL,
    PRIMARY KEY (user_id, challenge_id),
    FOREIGN KEY (user_id) REFERENCES rhombus_user(id),
    FOREIGN KEY (challenge_id) REFERENCES rhombus_challenge(id)
);

CREATE TABLE IF NOT EXISTS rhombus_team (
    id INTEGER PRIMARY KEY NOT NULL,
    name TEXT NOT NULL UNIQUE,
    invite_token TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rhombus_team_division (
    team_id INTEGER NOT NULL,
    division_id INTEGER NOT NULL,
    PRIMARY KEY (team_id, division_id),
    FOREIGN KEY (team_id) REFERENCES rhombus_team(id),
    FOREIGN KEY (division_id) REFERENCES rhombus_division(id)
);

CREATE TABLE IF NOT EXISTS rhombus_ticket (
    ticket_number INTEGER NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    challenge_id INTEGER NOT NULL,
    closed_at INTEGER,
    discord_channel_id INTEGER NOT NULL UNIQUE,
    discord_last_message_id INTEGER,
    PRIMARY KEY (ticket_number),
    FOREIGN KEY (user_id) REFERENCES rhombus_user(id),
    FOREIGN KEY (challenge_id) REFERENCES rhombus_challenge(id)
);

CREATE TABLE IF NOT EXISTS rhombus_ticket_email_message_id_reference (
    message_id TEXT NOT NULL,
    ticket_number INTEGER NOT NULL,
    user_sent BOOLEAN NOT NULL DEFAULT(FALSE),
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

CREATE VIEW IF NOT EXISTS rhombus_challenge_division_points AS
SELECT
    rhombus_challenge.id AS challenge_id,
    rhombus_division.id AS division_id,
    CASE
        WHEN rhombus_challenge.score_type = 0 THEN
            MAX(ROUND((((100 - 500) / POWER(50, 2)) * POWER(COUNT(DISTINCT rhombus_team.id), 2)) + 500), 100)
        ELSE rhombus_challenge.static_points
    END AS points,
    COUNT(DISTINCT rhombus_team.id) AS solves
FROM rhombus_challenge
CROSS JOIN rhombus_division
LEFT JOIN rhombus_solve ON
    rhombus_challenge.id = rhombus_solve.challenge_id AND
    rhombus_solve.user_id IN (
        SELECT rhombus_user.id
        FROM rhombus_user
        JOIN rhombus_team ON rhombus_user.team_id = rhombus_team.id
        JOIN rhombus_team_division ON rhombus_team.id = rhombus_team_division.team_id
        WHERE rhombus_team_division.division_id = rhombus_division.id
    )
LEFT JOIN rhombus_user ON rhombus_solve.user_id = rhombus_user.id
LEFT JOIN rhombus_team ON rhombus_user.team_id = rhombus_team.id
GROUP BY rhombus_challenge.id, rhombus_division.id;

CREATE VIEW IF NOT EXISTS rhombus_team_division_points AS
SELECT rhombus_team_division.team_id, rhombus_team_division.division_id, SUM(points) as points
FROM rhombus_team_division
JOIN (
    SELECT DISTINCT rhombus_user.team_id, rhombus_challenge_division_points.challenge_id, rhombus_challenge_division_points.division_id, rhombus_challenge_division_points.points
    FROM rhombus_challenge_division_points
    JOIN rhombus_solve ON rhombus_challenge_division_points.challenge_id = rhombus_solve.challenge_id
    JOIN rhombus_user ON rhombus_solve.user_id = rhombus_user.id
) AS unique_solves ON rhombus_team_division.team_id = unique_solves.team_id AND rhombus_team_division.division_id = unique_solves.division_id
GROUP BY rhombus_team_division.team_id, rhombus_team_division.division_id;

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
