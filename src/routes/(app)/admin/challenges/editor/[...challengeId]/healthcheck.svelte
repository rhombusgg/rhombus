<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api';
	import { mode } from 'mode-watcher';
	import { Loader2 } from 'lucide-svelte';
	import clsx from 'clsx';
	import * as Select from '$lib/components/ui/select';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import {
		RhombusUtilities,
		healthcheckOutputSchema,
		type HealthcheckOutput
	} from '$lib/healthcheck/healthcheck';

	export let initialScript: string | undefined;
	let enabled = !!initialScript;

	let editor: Monaco.editor.IStandaloneCodeEditor;
	let model: Monaco.editor.ITextModel;
	let monaco: typeof Monaco;
	let editorContainer: HTMLElement;
	type Template = 'http' | 'tcp';
	let selectedTemplate: Template = 'http';

	const httpTemplate =
		`
/**
 * Called at an interval on the server with nodejs. Should
 * return true if the challenge is up. Maximum execution
 * time of 10 seconds.
 */
export async function health(): Promise<boolean> {
	const result = await fetch("https://webchallenge.play.rhombus.gg");
	return result.status === 200;
}
`.trim() + '\n';

	const tcpTemplate =
		`
/**
 * Called at an interval on the server with nodejs. Should
 * return true if the challenge is up. Maximum execution
 * time of 10 seconds.
 */
export async function health(): Promise<boolean> {
	const result = await Rhombus.tcpConnect("play.rhombus.gg", 13377);
	if (result.status === "success") {
		return result.value.startsWith("Hello");
	}
	return false;
}
`.trim() + '\n';

	let content = initialScript || httpTemplate;
	let timeout: number | undefined;
	let healthcheck: HealthcheckOutput | undefined = undefined;

	async function runHealthcheck() {
		healthcheck = healthcheckOutputSchema.parse(
			await (
				await fetch('/admin/challenges/api/healthcheck', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({ typescript: content })
				})
			).json()
		);
		timeout = undefined;
	}

	onMount(async () => {
		if (enabled) runHealthcheck();
		monaco = (await import('./monaco')).default;

		const uri = 'ts:rhombus/utils.ts';
		monaco.languages.typescript.javascriptDefaults.addExtraLib(RhombusUtilities, uri);
		monaco.editor.createModel(RhombusUtilities, 'typescript', monaco.Uri.parse(uri));

		editor = monaco.editor.create(editorContainer);
		model = monaco.editor.createModel(content, 'typescript');
		monaco.editor.defineTheme('customDark', {
			base: 'vs-dark',
			inherit: true,
			rules: [],
			colors: {
				'editor.background': '#020817' // from tailwindcss's slate-950, the dark theme's background color
			}
		});

		if ($mode === 'dark') {
			monaco.editor.setTheme('customDark');
		} else {
			monaco.editor.setTheme('vs');
		}
		editor.setModel(model);
		editor.updateOptions({
			minimap: { enabled: false },
			scrollBeyondLastLine: false,
			scrollbar: {
				verticalScrollbarSize: 0
			},
			folding: false
		});
		model.onDidChangeContent(() => {
			content = model.getValue();
			window.clearTimeout(timeout);
			timeout = undefined;
			timeout = window.setTimeout(() => {
				runHealthcheck();
			}, 2000);
		});
	});

	mode.subscribe((m) => {
		if (m === 'dark') {
			monaco?.editor.setTheme('customDark');
		} else {
			monaco?.editor.setTheme('vs');
		}
	});

	onDestroy(() => {
		monaco?.editor.getModels().forEach((model) => model.dispose());
		editor?.dispose();
	});

	function onSelectedChange(option: unknown) {
		selectedTemplate = (option as { value: Template; label: string }).value;
		if (selectedTemplate === 'http') {
			content = httpTemplate;
		} else if (selectedTemplate === 'tcp') {
			content = tcpTemplate;
		}
		model.setValue(content);
	}
</script>

<div class="flex items-center gap-x-2">
	<Checkbox
		id="enable-healthcheck"
		aria-labelledby="enable-healthcheck-label"
		bind:checked={enabled}
	/>
	<Label
		id="enable-healthcheck-label"
		for="enable-healthcheck"
		class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
	>
		Enable Healthcheck
	</Label>
</div>

{#if enabled && !initialScript}
	<div class="flex items-center gap-x-2">
		<Select.Root
			{onSelectedChange}
			selected={selectedTemplate === 'http'
				? { value: 'http', label: 'HTTP' }
				: { value: 'none', label: 'No healthcheck' }}
		>
			<Select.Trigger class="w-[180px]" id="healthcheck">
				<Select.Value placeholder="Select a template..." />
			</Select.Trigger>
			<Select.Content>
				<Select.Item class="cursor-pointer" value="http">HTTP</Select.Item>
				<Select.Item class="cursor-pointer" value="tcp">TCP/Netcat</Select.Item>
			</Select.Content>
		</Select.Root>
		<Label
			id="healthcheck-label"
			for="healthcheck"
			class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
		>
			Healthcheck Template
		</Label>
	</div>
{/if}
<div class="relative">
	<div
		class={clsx('h-[250px]', !enabled && 'absolute -z-10 w-full opacity-0')}
		bind:this={editorContainer}
	/>
</div>
<div
	class={clsx('min-h-[68px] rounded-md bg-primary-foreground p-2 font-mono', !enabled && 'hidden')}
>
	{#if timeout}
		<div class="flex items-center gap-2">
			<Loader2 class="h-4 w-4 animate-spin" />
			<span class="mt-1">Loading...</span>
		</div>
		<br />
	{:else if healthcheck}
		<div class="flex items-center gap-2">
			{#if healthcheck.status === 'ran' && healthcheck.healthy}
				<span class="flex h-4 w-4 items-center justify-center rounded-full bg-green-500" />
				<span class="mt-1">Healthy</span>
			{:else if healthcheck.status === 'ran' && !healthcheck.healthy}
				<div class="h-4 w-4 rounded-full bg-red-500" />
				<span class="mt-1">Unhealthy</span>
			{:else}
				<div class="h-4 w-4 rounded-full bg-red-500" />
				<span class="mt-1">Error</span>
			{/if}
		</div>
		{#if healthcheck.status === 'error'}
			<span class="italic">{healthcheck.message}</span>
		{:else if healthcheck.status === 'ran'}
			{#if healthcheck.logs.length === 0}
				<span class="text-muted-foreground">no logs...</span>
			{:else}
				{healthcheck.logs}
			{/if}
		{/if}
	{/if}
</div>
<input type="hidden" name="healthcheck" value={enabled ? content : ''} />
