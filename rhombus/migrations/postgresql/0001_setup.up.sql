CREATE TABLE IF NOT EXISTS Challenge (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "User" (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    avatar VARCHAR(255) NOT NULL UNIQUE,
    discord_id VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS Track (
    ip VARCHAR(39), -- 39 is the max length of an IPv6 address
    user_agent TEXT,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (ip, user_agent)
);

CREATE TABLE IF NOT EXISTS TrackConnection (
    ip VARCHAR(39),
    user_agent TEXT,
    user_id BIGINT,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (ip, user_agent) REFERENCES Track(ip, user_agent),
    FOREIGN KEY (user_id) REFERENCES "User"(id),
    PRIMARY KEY (ip, user_agent, user_id)
);
