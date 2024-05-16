import { render } from "solid-js/web";
import Tooltip from "@corvu/tooltip";
import {
  For,
  Show,
  createEffect,
  createResource,
  onCleanup,
  onMount,
} from "solid-js";
import { customElement } from "solid-element";

customElement("rhombus-tooltip", (props, { element }) => {
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

const [data, { refetch }] = createResource(
  async () =>
    (await (
      await fetch("/challenges", {
        headers: { accept: "application/json" },
      })
    ).json()) as ChallengesData,
);
const handler = () => refetch();

const ChallengesComponent = () => {
  document.body.removeEventListener("manualRefresh", handler);
  document.body.addEventListener("manualRefresh", handler);
  window.removeEventListener("focus", handler);
  window.addEventListener("focus", handler);

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
                                    <>
                                      Challenge is{" "}
                                      <span class="text-green-500">up</span>
                                    </>
                                  ) : (
                                    <>
                                      Challenge is{" "}
                                      <span class="text-red-500">down</span>
                                    </>
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
                                      Solved by{" "}
                                      {data().team.users[solve.user_id].name}
                                    </span>
                                    <Tooltip.Arrow class="text-secondary" />
                                  </Tooltip.Content>
                                </Tooltip.Portal>
                                <Tooltip.Trigger
                                  as="img"
                                  class="aspect-square rounded-full h-8"
                                  alt={`Solved by ${data().team.users[solve.user_id].name}`}
                                  src={
                                    data().team.users[solve.user_id].avatar_url
                                  }
                                />
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
                                            {division_points.solves} solve
                                            {division_points.solves !== 1
                                              ? "s"
                                              : ""}
                                          </td>
                                          <td>
                                            {division_points.points} point
                                            {division_points.points !== 1
                                              ? "s"
                                              : ""}
                                          </td>
                                        </tr>
                                      ),
                                    )}
                                  </table>
                                  <Tooltip.Arrow class="text-secondary" />
                                </Tooltip.Content>
                              </Tooltip.Portal>
                              <Tooltip.Trigger as="span" class="cursor-pointer">
                                {challenge.division_points[0].solves} solve
                                {challenge.division_points[0].solves !== 1
                                  ? "s"
                                  : ""}{" "}
                                / {challenge.division_points[0].points} point
                                {challenge.division_points[0].points !== 1
                                  ? "s"
                                  : ""}
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
                                    <span>Authored by {author.name}</span>
                                    <Tooltip.Arrow class="text-secondary" />
                                  </Tooltip.Content>
                                </Tooltip.Portal>
                                <Tooltip.Trigger
                                  as="img"
                                  class="aspect-square rounded-full h-8"
                                  alt={`Authored by ${author.name}`}
                                  src={author.avatar_url}
                                />
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
                                  <span>Create new ticket</span>
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
                                  <span>View full challenge</span>
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

export function renderChallenges(element: HTMLElement) {
  render(() => <ChallengesComponent />, element);
}
