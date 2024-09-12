import { render } from "solid-js/web";
import { Tooltip } from "@kobalte/core/tooltip";
import {
  For,
  Show,
  createEffect,
  createResource,
  createSignal,
  onMount,
  onCleanup,
} from "solid-js";
import { customElement } from "solid-element";
import { SolidMarkdown } from "solid-markdown";
import {
  SunIcon,
  MoonIcon,
  HomeIcon,
  TrophyIcon,
  SwordsIcon,
  UsersIcon,
  UserIcon,
  LogInIcon,
  LogOutIcon,
} from "lucide-solid";
import { Toaster } from "solid-toast";

export { toast } from "solid-toast";

import { FluentBundle, FluentResource } from "@fluent/bundle";
import { negotiateLanguages } from "@fluent/langneg";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "./command";

function navigate(url: string) {
  // @ts-ignore
  htmx.ajax("GET", url, {
    select: "#screen",
    target: "#screen",
    swap: "outerHTML",
    history: "push",
    headers: {
      "HX-Boosted": true,
    },
  });
  history.pushState({ htmx: true }, "", url);
}

const CommandMenu = () => {
  const [open, setOpen] = createSignal(false);

  const [data] = createResource(
    async () =>
      (await (await fetch("/command-palette")).json()) as CommandPaletteData,
  );

  onMount(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    // @ts-ignore
    window.openCommandPalette = () => setOpen(true);

    document.addEventListener("keydown", down);
    onCleanup(() => document.removeEventListener("keydown", down));
  });

  return (
    <CommandDialog open={open()} onOpenChange={setOpen}>
      <CommandInput placeholder={translate("type-to-search")} />
      <CommandList>
        <CommandEmpty>{translate("no-results")}</CommandEmpty>
        <CommandGroup heading={translate("pages")}>
          <CommandItem
            onSelect={() => {
              navigate("/");
              setOpen(false);
            }}
          >
            <HomeIcon class="mr-2 h-4 w-4" />
            <span>{translate("home")}</span>
          </CommandItem>
          <Show when={data().challenges}>
            <CommandItem
              onSelect={() => {
                navigate("/challenges");
                setOpen(false);
              }}
            >
              <SwordsIcon class="mr-2 h-4 w-4" />
              <span>{translate("challenges")}</span>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                navigate("/team");
                setOpen(false);
              }}
            >
              <UsersIcon class="mr-2 h-4 w-4" />
              <span>{translate("team")}</span>
            </CommandItem>
            <CommandItem
              onSelect={() => {
                navigate("/account");
                setOpen(false);
              }}
            >
              <UserIcon class="mr-2 h-4 w-4" />
              <span>{translate("account")}</span>
            </CommandItem>
          </Show>
          <Show when={!data().challenges}>
            <CommandItem
              onSelect={() => {
                navigate("/signin");
                setOpen(false);
              }}
            >
              <LogInIcon class="mr-2 h-4 w-4" />
              <span>{translate("sign-in")}</span>
            </CommandItem>
          </Show>
        </CommandGroup>
        <CommandSeparator />
        <Show when={data().challenges}>
          <For each={Object.entries(data().challenges)}>
            {(category) => {
              const category_name = category[0];
              const challenges = category[1];
              return (
                <CommandGroup heading={category_name}>
                  <For each={challenges}>
                    {(challenge) => {
                      return (
                        <CommandItem
                          onSelect={() => {
                            navigate(`/challenges#${challenge}`);
                            setOpen(false);
                          }}
                        >
                          <SwordsIcon class="mr-2 h-4 w-4" />
                          <span>{challenge}</span>
                        </CommandItem>
                      );
                    }}
                  </For>
                </CommandGroup>
              );
            }}
          </For>
          <CommandSeparator />
        </Show>
        <Show when={data().divisions}>
          <CommandGroup heading={translate("scoreboard-title")}>
            <For each={Object.entries(data().divisions)}>
              {(division) => {
                const id = division[0];
                const name = division[1];
                return (
                  <CommandItem
                    onSelect={() => {
                      navigate(`/scoreboard/${id}`);
                      setOpen(false);
                    }}
                  >
                    <TrophyIcon class="mr-2 h-4 w-4" />
                    <span>{translate("scoreboard", { scoreboard: name })}</span>
                  </CommandItem>
                );
              }}
            </For>
          </CommandGroup>
          <CommandSeparator />
        </Show>
        <CommandGroup heading={translate("account")}>
          <Show when={!data().challenges}>
            <CommandItem
              onSelect={() => {
                // @ts-ignore
                window.location = "/signin/discord";
              }}
            >
              <LogInIcon class="mr-2 h-4 w-4" />
              <span>{translate("sign-in-with-discord")}</span>
            </CommandItem>
          </Show>
          <Show when={data().challenges}>
            <CommandItem
              onSelect={() => {
                navigate("/signout");
                setOpen(false);
              }}
            >
              <LogOutIcon class="mr-2 h-4 w-4" />
              <span>{translate("sign-out")}</span>
            </CommandItem>
          </Show>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading={translate("theme")}>
          <CommandItem
            onSelect={() => {
              // @ts-ignore
              setTheme(false);
              setOpen(false);
            }}
          >
            <SunIcon class="mr-2 h-4 w-4" />
            <span>{translate("light-theme")}</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              // @ts-ignore
              setTheme(true);
              setOpen(false);
            }}
          >
            <MoonIcon class="mr-2 h-4 w-4" />
            <span>{translate("dark-theme")}</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

const localizations: Record<string, string> = {
  en: `
type-to-search = Type a command or search...
no-results = No results found.
pages = Pages
home = Home
challenges = Challenges
team = Team
account = Account
sign-in = Sign In
scoreboard-title = Division Scoreboards
scoreboard = {$scoreboard} Scoreboard
sign-in-with-discord = Sign In with Discord
sign-out = Sign Out
theme = Theme
light-theme = Light Theme
dark-theme = Dark Theme

healthy = Challenge is <span class="text-green-500">up</span>. Last checked {$last_checked ->
  [one] {$last_checked} minute
  *[other] {$last_checked} minutes
} ago
unhealthy = Challenge is <span class="text-red-500">down</span>. Last checked {$last_checked ->
  [one] {$last_checked} minute
  *[other] {$last_checked} minutes
} ago
solved-by = Solved by {$name}
authored-by = Authored by {$name}
solves = {$solves ->
  [one] {$solves} solve 
  *[other] {$solves} solves
}
points = {$points ->
  [one] {$points} point
  *[other] {$points} points
}
solves-points = {solves} / {points}
  `.trim(),
  de: `
type-to-search = Befehl oder Suche eingeben...
no-results = Keine Ergebnisse gefunden.
pages = Seiten
home = Startseite
challenges = Challenges
team = Team
account = Konto
sign-in = Anmelden
scoreboard-title = Teilung Anzeigetafeln
scoreboard = {$scoreboard} Anzeigetafel
sign-in-with-discord = Mit Discord anmelden
sign-out = Abmelden
theme = Farbdesign
light-theme = Helles Farbdesign
dark-theme = Dunkles Farbdesign

healthy = Challenge ist <span class="text-green-500">online</span> und wurde vor {$last_checked ->
  [one] {$last_checked} Minute
  *[other] {$last_checked} Minuten
} überprüft
unhealthy = Challenge ist <span class="text-red-500">offline</span> und wurde vor {$last_checked ->
  [one] {$last_checked} Minute
  *[other] {$last_checked} Minuten
} überprüft
solved-by = Gelöst von {$name}
authored-by = Geschrieben von {$name}
solves = {$solves ->
  [one] {$solves} Lösung
  *[other] {$solves} Lösungen
}
points = {$points ->
  [one] {$points} Punkt
  *[other] {$points} Punkte
}
solves-points = {solves} / {points}
`.trim(),
};

const negotiatedLocales = negotiateLanguages(
  navigator.languages,
  Object.keys(localizations),
  {
    defaultLocale: Object.keys(localizations)[0],
  },
);

const bundles = negotiatedLocales.map((locale) => {
  const bundle = new FluentBundle(locale);
  bundle.addResource(new FluentResource(localizations[locale]));
  return bundle;
});

export function translate(key: string, args?: Record<string, string | number>) {
  for (const bundle of bundles) {
    const message = bundle.getMessage(key);
    if (message) {
      return bundle.formatPattern(message.value, args);
    }
  }
  return key;
}

customElement("rhombus-tooltip", (_props, { element }) => {
  const anchor = document.querySelector("dialog");

  // @ts-ignore
  let children: HTMLCollection = element.renderRoot.host.children;
  let content: Element = undefined;
  let trigger: Element = undefined;
  for (let i = 0; i < children.length; i++) {
    const slot = children[i].slot;
    if (slot === "content") {
      content = children[i];
    } else {
      trigger = children[i];
    }
  }

  return (
    <Tooltip placement="top">
      <Tooltip.Portal mount={anchor}>
        <Tooltip.Content class="tooltip">
          {content}
          <Tooltip.Arrow class="text-secondary" />
        </Tooltip.Content>
      </Tooltip.Portal>
      <Tooltip.Trigger as="div">{trigger}</Tooltip.Trigger>
    </Tooltip>
  );
});

const ChallengesComponent = ({
  challenge_json,
}: {
  challenge_json: ChallengesData;
}) => {
  const [shouldFetch, setShouldFetch] = createSignal<boolean>();
  const [data, { refetch }] = createResource(
    shouldFetch,
    async () =>
      (await (
        await fetch("/challenges", {
          headers: { accept: "application/json" },
        })
      ).json()) as ChallengesData,
    { initialValue: challenge_json },
  );

  (window as any).challengeRefetchHandler = () => {
    setShouldFetch(true);
    refetch();
  };

  createEffect(() => {
    data();
    // @ts-ignore
    htmx.process(document.body);
  });

  return (
    <Show when={data()}>
      <For each={data().categories}>
        {(category) => {
          const challenges = data().challenges.filter(
            (challenge) => challenge.category_id === category.id,
          );

          return (
            <div>
              <div
                class="flex justify-between rounded-md p-4 font-bold"
                style={`background-color: ${category.color}`}
              >
                <span>{category.name}</span>
                <span>
                  {
                    challenges.filter(
                      (challenge) =>
                        data().team.solves[challenge.id] !== undefined,
                    ).length
                  }{" "}
                  / {challenges.length}
                </span>
              </div>
              <ul class="flex flex-col gap-4 px-2 pt-4">
                <For each={challenges}>
                  {(challenge) => {
                    const author = data().authors[challenge.author_id];
                    const solve = data().team.solves[challenge.id];

                    return (
                      <li
                        classList={{
                          ring: location.hash.substring(1) === challenge.name,
                        }}
                        class="border-l-4 bg-card p-4 ring-offset-4 ring-offset-background"
                        style={`border-color: ${category.color}; --tw-ring-color: ${category.color}`}
                      >
                        <div class="mb-2 flex justify-between h-8">
                          <div class="font-bold flex items-center gap-2">
                            <button hx-trigger="click"
                              hx-get={`/challenges/${challenge.id}`}
                              hx-target="body"
                              hx-swap="beforeend">
                              <span style={`color: ${category.color}`}>
                                {category.name} /
                              </span>
                              <span> {challenge.name}</span>
                            </button>
                            <Show when={challenge.health}>
                              <Tooltip placement="top">
                                <Tooltip.Portal>
                                  <Tooltip.Content class="tooltip">
                                    {challenge.health.healthy ? (
                                      <div
                                        innerHTML={translate("healthy", {
                                          last_checked: Math.ceil(
                                            (new Date().getTime() -
                                              new Date(
                                                challenge.health.last_checked,
                                              ).getTime()) /
                                              1000 /
                                              60,
                                          ),
                                        })}
                                      ></div>
                                    ) : (
                                      <div
                                        innerHTML={translate("unhealthy", {
                                          last_checked: Math.ceil(
                                            (new Date().getTime() -
                                              new Date(
                                                challenge.health.last_checked,
                                              ).getTime()) /
                                              1000 /
                                              60,
                                          ),
                                        })}
                                      ></div>
                                    )}
                                    <Tooltip.Arrow class="text-secondary" />
                                  </Tooltip.Content>
                                </Tooltip.Portal>
                                <Tooltip.Trigger
                                  as="div"
                                  class={`size-3 rounded-full cursor-pointer ${challenge.health.healthy ? "bg-green-500" : "bg-red-500"}`}
                                />
                              </Tooltip>
                            </Show>
                          </div>
                          <div class="flex items-center gap-4">
                            <Show when={solve}>
                              <Tooltip placement="top">
                                <Tooltip.Portal>
                                  <Tooltip.Content class="tooltip">
                                    <span>
                                      {translate("solved-by", {
                                        name: data().team.users[solve.user_id]
                                          .name,
                                      })}
                                    </span>
                                    <Tooltip.Arrow class="text-secondary" />
                                  </Tooltip.Content>
                                </Tooltip.Portal>
                                <Tooltip.Trigger
                                  as="a"
                                  hx-boost="true"
                                  hx-select="#screen"
                                  hx-target="#screen"
                                  hx-swap="outerHTML"
                                  href={`/user/${solve.user_id}`}
                                >
                                  <img
                                    class="aspect-square rounded-full h-8"
                                    alt={translate("solved-by", {
                                      name: data().team.users[solve.user_id]
                                        .name,
                                    })}
                                    src={
                                      data().team.users[solve.user_id]
                                        .avatar_url
                                    }
                                  />
                                </Tooltip.Trigger>
                              </Tooltip>
                            </Show>
                            <Tooltip placement="top">
                              <Tooltip.Portal>
                                <Tooltip.Content class="tooltip">
                                  <table>
                                    {challenge.division_points.map(
                                      (division_points) => (
                                        <tr>
                                          <td class="pr-2 text-right">
                                            {
                                              data().divisions[
                                                division_points.division_id
                                              ].name
                                            }
                                          </td>
                                          <td class="pr-2">
                                            {translate("solves", {
                                              solves: division_points.solves,
                                            })}
                                          </td>
                                          <td>
                                            {translate("points", {
                                              points: division_points.points,
                                            })}
                                          </td>
                                        </tr>
                                      ),
                                    )}
                                  </table>
                                  <Tooltip.Arrow class="text-secondary" />
                                </Tooltip.Content>
                              </Tooltip.Portal>
                              <Tooltip.Trigger as="span" class="cursor-pointer">
                                {translate("solves-points", {
                                  solves: challenge.division_points[0].solves,
                                  points: challenge.division_points[0].points,
                                })}
                              </Tooltip.Trigger>
                            </Tooltip>
                            <Show when={author}>
                              <Tooltip placement="top">
                                <Tooltip.Portal>
                                  <Tooltip.Content class="tooltip">
                                    <span>
                                      {translate("authored-by", {
                                        name: author.name,
                                      })}
                                    </span>
                                    <Tooltip.Arrow class="text-secondary" />
                                  </Tooltip.Content>
                                </Tooltip.Portal>
                                <Tooltip.Trigger
                                  as="img"
                                  class="aspect-square rounded-full h-8"
                                  alt={translate("authored-by", {
                                    name: author.name,
                                  })}
                                  src={author.avatar_url}
                                />
                              </Tooltip>
                            </Show>
                            <Show when={data().ticket_enabled}>
                              <button
                                hx-trigger="click"
                                hx-get={`/challenges/${challenge.id}/ticket`}
                                hx-target="body"
                                hx-swap="beforeend"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="24"
                                  height="24"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  stroke-width="2"
                                  stroke-linecap="round"
                                  stroke-linejoin="round"
                                  class="lucide lucide-ticket -rotate-45"
                                >
                                  <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                                  <path d="M13 5v2" />
                                  <path d="M13 17v2" />
                                  <path d="M13 11v2" />
                                </svg>
                              </button>
                            </Show>
                            <button
                              hx-trigger="click"
                              hx-get={`/challenges/${challenge.id}`}
                              hx-target="body"
                              hx-swap="beforeend"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                class="lucide lucide-layout-grid"
                              >
                                <rect width="7" height="7" x="3" y="3" rx="1" />
                                <rect
                                  width="7"
                                  height="7"
                                  x="14"
                                  y="3"
                                  rx="1"
                                />
                                <rect
                                  width="7"
                                  height="7"
                                  x="14"
                                  y="14"
                                  rx="1"
                                />
                                <rect
                                  width="7"
                                  height="7"
                                  x="3"
                                  y="14"
                                  rx="1"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <SolidMarkdown
                          class="prose dark:prose-invert"
                          children={challenge.description}
                        />
                      </li>
                    );
                  }}
                </For>
              </ul>
            </div>
          );
        }}
      </For>
    </Show>
  );
};

type CommandPaletteData = {
  challenges?: Record<string, string[]>;
  divisions: Record<string, string>;
};

type ChallengesData = {
  ticket_enabled: boolean;
  challenges: {
    id: number;
    name: string;
    description: string;
    health: {
      healthy: boolean;
      last_checked: string;
    } | null;
    category_id: number;
    author_id: number;
    division_points: {
      division_id: number;
      points: number;
      solves: number;
    }[];
  }[];
  categories: {
    id: number;
    name: string;
    color: string;
  }[];
  authors: Record<
    number,
    {
      name: string;
      avatar_url: string;
    }
  >;
  divisions: Record<
    number,
    {
      name: string;
    }
  >;
  team: {
    users: Record<
      number,
      {
        name: string;
        avatar_url: string;
      }
    >;
    solves: Record<
      number,
      {
        solved_at: Date;
        user_id: number;
      }
    >;
  };
};

export function renderChallenges(
  element: HTMLElement,
  challenge_json: ChallengesData,
) {
  element.innerHTML = "";
  render(
    () => <ChallengesComponent challenge_json={challenge_json} />,
    element,
  );
}

document.addEventListener("DOMContentLoaded", () => {
  render(
    () => <Toaster position="top-center" gutter={8} />,
    document.querySelector("#toaster"),
  );

  render(() => <CommandMenu />, document.body);

  document.body.addEventListener("pageRefresh", () => {
    location.reload();
  });
});
