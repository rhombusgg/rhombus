sign-in = Sign In
team = Team
user = User
account = Account
challenges = Challenges
solves-points = {solves} / {points}
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
solves = {$solves ->
    [one] {$solves} solve
    *[other] {$solves} solves
}
points = {$points -> 
    [one] {$points} pt
    *[other] {$points} pts
}
command-palette = Command Palette...
    .hint = Type a command...
