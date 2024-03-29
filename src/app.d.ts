// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface Platform {}
		interface Locals {
			session: Session | undefined;
		}

		interface PageData {
			session: Session | undefined;
			challenges: Challenge[];
		}
	}

	interface Challenge {
		id: string;
		slug: string;
		name: string;
		description: string;
		category: {
			name: string;
			color: string;
		};
		difficulty: string;
		ticketTemplate: string | null;
		points: number;
		health: {
			healthy: boolean;
			lastChecked: Date;
		} | null;
		authorDiscord: {
			id: string;
			username: string;
			globalUsername: string;
			image: string;
		};
		globalSolveCount: number;
		solve: {
			time: Date;
			user: {
				discord: {
					id: string;
					username: string;
					globalUsername: string;
					image: string;
				} | null;
				email: string | undefined;
				avatarFallback: string;
				id: string;
			};
		} | null;
		userWriteupLinks: string[];
	}

	interface Session {
		id: string;
		discord?: {
			id: string;
			image: string;
			username: string;
			globalUsername: string;
		};
		emails: string[];
		avatarFallback: string;
		isTeamOwner: boolean;
		isAdmin: boolean;
		team: {
			id: string;
			ownerId: string;
			inviteToken: string;
			users: {
				id: string;
				discord: {
					id: string;
					username: string;
					globalUsername: string;
					image: string;
				} | null;
				emails: {
					email: string;
				}[];
			}[];
		};
	}

	declare type Item = import('svelte-dnd-action').Item;
	declare type DndEvent<ItemType = Item> = import('svelte-dnd-action').DndEvent<ItemType>;
	declare namespace svelteHTML {
		interface HTMLAttributes<T> {
			'on:consider'?: (
				event: CustomEvent<DndEvent<ItemType>> & { target: EventTarget & T }
			) => void;
			'on:finalize'?: (
				event: CustomEvent<DndEvent<ItemType>> & { target: EventTarget & T }
			) => void;
		}
	}
}

export {};
