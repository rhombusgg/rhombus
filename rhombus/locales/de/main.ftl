sign-in = Anmelden
scoreboard = Anzeigetafel
team = Team
account = Konto
challenges = Challenges

account-description = Verwalten Sie Ihre individuellen Kontoeinstellungen. Sehen Sie sich
    {$link_start}öffentliches Profil{$link_end} an.
account-discord-integration = Discord-Integration
account-discord-integration-description = Verbinde dein Discord-Konto, um umfassende Funktionsintegrationen zu erhalten
account-discord-integration-link-discord = Discord verbinden
account-discord-integration-link-discord-description =
    Challenge-Autoren sind auf Discord und die Verifizierung Ihres Discord-Kontos
    ermöglicht eine bessere Kommunikation bei Problemen.
account-discord-integration-join-server = Server beitreten
account-discord-integration-join-server-description =
    Tritt dem offiziellen Discord-Server bei, um wichtige Ankündigungen zu erhalten
    und mit anderen Teilnehmern zu chatten.

team-success-set-team-name = Teamname erfolgreich gesetzt
team-error-name-length = Teamname muss zwischen 3 und 30 Zeichen lang sein
team-error-name-taken = Teamname bereits vergeben

account-check-email = Überprüfen Sie Ihre E-Mail auf einen Bestätigungslink
account-error-email-length = E-Mail-Adresse muss zwischen 1 und 255 Zeichen lang sein
account-error-email-already-added = E-Mail-Adresse bereits hinzugefügt
account-error-verification-email = Fehler beim Senden der Bestätigungs-E-Mail

challenges-ticket-submitted = Ticket eingereicht
challenges-challenge-solved = Challenge gelöst
challenges-error-ticket-too-long = Ticket ist zu lang
challenges-error-incorrect-flag = Falsche Flag
challenges-error-writeup-invalid-url = Ungültige URL
challenges-error-writeup-url-too-long = URL ist zu lang
challenges-error-writeup-server-error = Server hat nicht erfolgreich geantwortet

unknown-error = Unbekannter Fehler

sign-out = Abmelden

solves = {$solves ->
  [one] {$solves} Lösung
  *[other] {$solves} Lösungen
}
points = {$points ->
  [one] {$points} Punkt
  *[other] {$points} Punkte
}
solves-points = {solves} / {points}

command-palette = Befehlspalette...
    .hint = Befehl eintippen...

time-difference = {$years ->
    [0] {$days ->
        [0] {$hours ->
            [0] {$minutes ->
                [0] {$seconds ->
                    [0] jetzt
                    [one] vor 1 Sekunde
                    *[other] vor {$seconds} Sekunden
                }
                [one] vor 1 Minute
                [2] vor ein paar Minuten
                *[other] vor {$minutes} Minuten
            }
            [one] vor 1 Stunde
            *[other] vor {$hours} Stunden
        }
        [one] vor 1 Tag
        *[other] vor {$days} Tage
    }
    [one] vor 1 Jahr
    *[other] vor {$years} Jahren
}
