import { render } from "solid-js/web";
import Tooltip from "@corvu/tooltip";
import {
  For,
  Show,
  createEffect,
  createResource,
  createSignal,
} from "solid-js";
import { customElement } from "solid-element";
import { Toaster, toast } from "solid-toast";

export { toast } from "solid-toast";

import { FluentBundle, FluentResource } from "@fluent/bundle";
import { negotiateLanguages } from "@fluent/langneg";

const localizations: Record<string, string> = {
  en: `
healthy = Challenge is <span class="text-green-500">up</span>
unhealthy = Challenge is <span class="text-red-500">down</span>
solved-by = Solved by {$name}
authored-by = Authored by {$name}
new-ticket = Create new ticket
focus-challenge = View full challenge
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
healthy = Challenge ist <span class="text-green-500">online</span>
unhealthy = Challenge ist <span class="text-red-500">offline</span>
solved-by = Gelöst von {$name}
authored-by = Geschrieben von {$name}
new-ticket = Neues Ticket erstellen
focus-challenge = Challenge im Detail ansehen
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
    <Tooltip
      placement="top"
      floatingOptions={{
        offset: 13,
        flip: true,
        shift: true,
      }}
      strategy="fixed"
    >
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

  (window as any).challengeRefetchHandlerInner = () => {
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
                            <div>
                              <span style={`color: ${category.color}`}>
                                {category.name} /
                              </span>
                              <span> {challenge.name}</span>
                            </div>
                            <Tooltip
                              placement="top"
                              floatingOptions={{
                                offset: 13,
                                flip: true,
                                shift: true,
                              }}
                              openOnFocus={false}
                            >
                              <Tooltip.Portal>
                                <Tooltip.Content class="tooltip">
                                  {challenge.healthy ? (
                                    <div innerHTML={translate("healthy")}></div>
                                  ) : (
                                    <div
                                      innerHTML={translate("unhealthy")}
                                    ></div>
                                  )}
                                  <Tooltip.Arrow class="text-secondary" />
                                </Tooltip.Content>
                              </Tooltip.Portal>
                              <Tooltip.Trigger
                                as="div"
                                class={`size-3 rounded-full cursor-pointer ${challenge.healthy ? "bg-green-500" : "bg-red-500"}`}
                              />
                            </Tooltip>
                          </div>
                          <div class="flex items-center gap-4">
                            <Show when={solve}>
                              <Tooltip
                                placement="top"
                                floatingOptions={{
                                  offset: 13,
                                  flip: true,
                                  shift: true,
                                }}
                              >
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
                            <Tooltip
                              placement="top"
                              floatingOptions={{
                                offset: 13,
                                flip: true,
                                shift: true,
                              }}
                            >
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
                              <Tooltip
                                placement="top"
                                floatingOptions={{
                                  offset: 13,
                                  flip: true,
                                  shift: true,
                                }}
                              >
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
                              <Tooltip
                                placement="top"
                                floatingOptions={{
                                  offset: 13,
                                  flip: true,
                                  shift: true,
                                }}
                                openOnFocus={false}
                              >
                                <Tooltip.Portal>
                                  <Tooltip.Content class="tooltip">
                                    <span>{translate("new-ticket")}</span>
                                    <Tooltip.Arrow class="text-secondary" />
                                  </Tooltip.Content>
                                </Tooltip.Portal>
                                <Tooltip.Trigger
                                  as="button"
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
                                </Tooltip.Trigger>
                              </Tooltip>
                            </Show>
                            <Tooltip
                              placement="top"
                              floatingOptions={{
                                offset: 13,
                                flip: true,
                                shift: true,
                              }}
                              openOnFocus={false}
                            >
                              <Tooltip.Portal>
                                <Tooltip.Content class="tooltip">
                                  <span>{translate("focus-challenge")}</span>
                                  <Tooltip.Arrow class="text-secondary" />
                                </Tooltip.Content>
                              </Tooltip.Portal>
                              <Tooltip.Trigger
                                as="button"
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
                                  <rect
                                    width="7"
                                    height="7"
                                    x="3"
                                    y="3"
                                    rx="1"
                                  />
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
                              </Tooltip.Trigger>
                            </Tooltip>
                          </div>
                        </div>
                        <div>{challenge.description}</div>
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

type ChallengesData = {
  ticket_enabled: boolean;
  challenges: {
    id: number;
    name: string;
    description: string;
    healthy: boolean;
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
  render(
    () => <ChallengesComponent challenge_json={challenge_json} />,
    element,
  );
}

document.addEventListener("DOMContentLoaded", () => {
  render(
    () => <Toaster attr:hx-preserve="true" position="top-center" gutter={8} />,
    document.querySelector("#toaster"),
  );

  document.body.addEventListener("pageRefresh", () => {
    location.reload();
  });
});
