<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Separator } from '$lib/components/ui/separator';
	import Selector from './selector.svelte';
	import Healthcheck from './healthcheck.svelte';
	import Name from './name.svelte';
	import Points from './points.svelte';
	import MarkdownEditor from './markdown-editor.svelte';
	import { Button } from '$lib/components/ui/button';
	import { superForm } from 'sveltekit-superforms/client';
	import { goto } from '$app/navigation';
	import toast from 'svelte-french-toast';
	import CategorySelector from './categorySelector.svelte';
	import { writable } from 'svelte/store';

	export let data;
	const { enhance, errors } = superForm(data.challengeForm, {
		async onUpdated({ form }) {
			if (form.valid) {
				if (data.existingChallenge) toast.success('Updated challenge');
				else toast.success('Created challenge');

				await goto(`/admin/challenges`);
			}
		}
	});

	$: difficultyOptions = data.difficulties.map((difficulty) => ({
		label: difficulty,
		value: difficulty
	}));

	let category = writable<
		| {
				id: string;
				name: string;
				color: string;
		  }
		| undefined
	>(undefined);
	let difficulty: string | undefined = undefined;
</script>

<svelte:head>
	<title>Admin - {data.existingChallenge ? 'Edit' : 'New'} Challenge</title>
	<meta name="description" content="Manage the CTF challenges" />
</svelte:head>

<div class="flex flex-col gap-4">
	<div>
		<h3 class="text-lg font-medium">{data.existingChallenge ? 'Edit' : 'New'} Challenge</h3>
		<p class="text-sm text-muted-foreground">
			{data.existingChallenge
				? `Edit challenge ${data.existingChallenge.name}`
				: 'Create a new challenge'}
		</p>
	</div>
	<Separator />
	<form class="flex flex-col gap-4" method="POST" action="?/createChallenge" use:enhance>
		{#if data.existingChallenge}
			<input type="hidden" name="existingChallengeId" value={data.existingChallenge.id} />
		{/if}
		<div class="setting">
			<div>
				<h4 class="heading">Name</h4>
				<p class="subheading">The name of the challenge</p>
			</div>
			<Name initial={data.existingChallenge?.name} />
			{#if $errors.name}
				<span class="invalid">{$errors.name}</span>
			{/if}
			{#if $errors.slug}
				<span class="invalid">{$errors.slug}</span>
			{/if}
		</div>
		<div class="setting">
			<div>
				<h4 class="heading">Description</h4>
				<p class="subheading">
					Markdown text description and instructions. Should include connection url and details if
					it exists
				</p>
			</div>
			<MarkdownEditor name="description" initial={data.existingChallenge?.description} />
			{#if $errors.description}
				<span class="invalid">{$errors.description}</span>
			{/if}
		</div>
		<div class="setting">
			<div>
				<h4 class="heading">Files</h4>
				<p class="subheading">Relavent or required files</p>
			</div>
		</div>
		<div class="setting">
			<div>
				<h4 class="heading">Health Check</h4>
				<p class="subheading">Write a simple healthcheck in Typescript</p>
			</div>
			<Healthcheck initialScript={data.existingChallenge?.health?.script} />
			{#if $errors.healthcheck}
				<span class="invalid">{$errors.healthcheck}</span>
			{/if}
		</div>
		<div class="setting">
			<div>
				<h4 class="heading">Ticket Template</h4>
				<p class="subheading">
					A markdown template for players to fill out when they submit an ticket
				</p>
			</div>
			<MarkdownEditor
				name="ticketTemplate"
				initial={data.existingChallenge?.ticketTemplate}
				none={`# Describe the issue with the challenge\n\n`}
			/>
			{#if $errors.ticketTemplate}
				<span class="invalid">{$errors.ticketTemplate}</span>
			{/if}
		</div>
		<div class="setting">
			<div>
				<h4 class="heading">Difficulty Level</h4>
				<p class="subheading">How hard you expect the challenge to be</p>
			</div>
			<Selector
				options={difficultyOptions}
				initial={data.existingChallenge?.difficulty}
				ui={{
					prompt: 'Select a difficulty level ...',
					placeholder: 'Search difficulty levels...',
					none: 'No difficulty levels found.',
					create: 'Create new difficulty level',
					dialog: {
						title: 'Create New Difficulty Level',
						description: 'Add a new difficulty for this challenge.'
					}
				}}
				onChange={(c) => {
					difficulty = c.value;
				}}
			/>
			{#if difficulty}
				<input type="hidden" name="difficulty" value={difficulty} />
			{/if}
			{#if $errors.difficulty}
				<span class="invalid">{$errors.difficulty}</span>
			{/if}
		</div>
		<div class="setting">
			<div>
				<h4 class="heading">Points</h4>
				<p class="subheading">The number of points the challenge is worth</p>
			</div>
			<Points initial={data.existingChallenge?.points} />
			{#if $errors.points}
				<span class="invalid">{$errors.points}</span>
			{/if}
		</div>
		<div class="setting">
			<div>
				<h4 class="heading">Category</h4>
				<p class="subheading">The category of the challenge</p>
			</div>
			<CategorySelector
				categories={data.categories}
				initial={data.existingChallenge?.category}
				{category}
			/>
			{#if $category}
				<input type="hidden" name="categoryId" value={$category.id} />
			{/if}
			{#if $errors.categoryId}
				<span class="invalid">{$errors.categoryId}</span>
			{/if}
		</div>
		<div class="setting">
			<div>
				<h4 class="heading">Flag</h4>
				<p class="subheading">The flag for the challenge</p>
			</div>
			<Input type="text" name="flag" autocomplete="off" value={data.existingChallenge?.flag} />
			{#if $errors.flag}
				<span class="invalid">{$errors.flag}</span>
			{/if}
		</div>
		<Button type="submit">
			{#if data.existingChallenge}
				Update Challenge
			{:else}
				Create Challenge
			{/if}
		</Button>
	</form>
</div>

<style lang="postcss">
	.heading {
		@apply text-sm font-semibold;
	}

	.subheading {
		@apply text-sm text-muted-foreground;
	}

	.setting {
		@apply flex flex-col gap-2;
	}

	.invalid {
		@apply text-red-500;
	}
</style>
