sign-in = Sign In
scoreboard = Scoreboard
team = Team
account = Account
challenges = Challenges

account-description = Manage your individual account settings. View
    {$link_start}public profile{$link_end}.
account-discord-integration = Discord Integration
account-discord-integration-description = Link your Discord account to get rich feature integrations
account-discord-integration-link-discord = Link Discord
account-discord-integration-link-discord-description =
    Challenge authors are on the Discord and verifying your Discord
    account allows for better one-on-one communication with issues.
account-discord-integration-join-server = Join Server
account-discord-integration-join-server-description =
    Join the official Discord server to get important announcements
    and chat with other competitors.

team-success-set-team-name = Set team name successfully
team-error-name-length = Team name must be between 3 and 30 characters
team-error-name-taken = Team name already taken
team-members-unlimited = {$count -> 
    [one] {$count} member
    *[other] {$count} members
}
team-members-unlimited-hint = {$count -> 
    [one] {$count} member
    *[other] {$count} members
} in your team
team-members-limited = {$count} / {$limit -> 
    [one] {$limit} member
    *[other] {$limit} members
}
team-members-limited-hint = {$count} out of {$limit -> 
    [one] {$limit} member
    *[other] {$limit} members
} in your team

account-check-email = Check your email for a verification link
account-error-email-length = Email must be between 1 and 255 characters
account-error-email-already-added = Email already added
account-error-verification-email = Failed to send verification email. (The email may already be added to another account).
account-error-signin-email = Failed to send sign in email
account-error-invalid-credentials = Invalid password
account-success-set-account-name = Set account name successfully
account-error-name-length = Account name must be between 3 and 30 characters
account-error-password-length = Password must be at least 8 characters
account-error-name-taken = Account name already taken

challenges-ticket-submitted = Ticket submitted. The author will get back to you shortly.
challenges-challenge-solved = Challenge solved
challenges-error-ticket-too-long = Ticket is too long
challenges-error-incorrect-flag = Incorrect flag
challenges-error-writeup-invalid-url = Invalid URL
challenges-error-writeup-url-too-long = URL is too long
challenges-error-writeup-server-error = Server did not respond successfully

unknown-error = Unknown error

sign-out = Sign Out

solves = {$solves ->
    [one] {$solves} solve
    *[other] {$solves} solves
}
points = {$points -> 
    [one] {$points} pt
    *[other] {$points} pts
}
solves-points = {solves} / {points}

command-palette = Command Palette...
    .hint = Type a command...

time-difference = {$years ->
    [0] {$days ->
        [0] {$hours ->
            [0] {$minutes ->
                [0] {$seconds ->
                    [0] just now
                    [one] 1 second ago
                    *[other] {$seconds} seconds ago
                }
                [one] 1 minute ago
                [2] a couple minutes ago
                [3] a few minutes ago
                [4] a few minutes ago
                *[other] {$minutes} minutes ago
            }
            [one] 1 hour ago
            *[other] {$hours} hours ago
        }
        [one] 1 day ago
        *[other] {$days} days ago
    }
    [one] 1 year ago
    *[other] {$years} years ago
}
