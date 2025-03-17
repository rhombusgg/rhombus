// deno-lint-ignore-file no-window
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
import toast, { Toaster } from "solid-toast";

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
} from "./command.tsx";

function navigate(url: string) {
  // @ts-ignore defined in browser by htmx import
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

    // @ts-ignore window is an any
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

type CommandPaletteData = {
  challenges?: Record<string, string[]>;
  divisions: Record<string, string>;
};

document.addEventListener("DOMContentLoaded", () => {
  render(
    () => <Toaster position="top-center" gutter={8} />,
    document.querySelector("#toaster"),
  );

  render(() => <CommandMenu />, document.body);

  document.body.addEventListener("pageRefresh", () => {
    location.reload();
  });

  document.body.addEventListener(
    "toast",
    (
      evt: Event & { detail: { kind: "success" | "error"; message: string } },
    ) => {
      const binaryString = atob(evt.detail.message);
      let bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const decoder = new TextDecoder("utf-8");
      const message = decoder.decode(bytes);

      if (evt.detail.kind === "success") {
        toast.success(message);
      } else if (evt.detail.kind === "error") {
        toast.error(message);
      } else {
        console.log("Unknown toast kind", evt.detail.kind);
      }
    },
  );
});
