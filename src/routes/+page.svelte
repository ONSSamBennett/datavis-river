<script>
	import { invalidate } from "$app/navigation";
	import {
		Button,
		Container,
		EmbedParent,
		Footer,
		Header,
		Main,
		Notice
	} from "@onsvisual/svelte-components";
	import VisualisationPreview from "$lib/VisualisationPreview.svelte";
	import { masonry } from "$lib/masonry.js";

	let { data } = $props();
	let retrying = $state(false);
	let selected = $state(null);
	/** @type {HTMLDialogElement} */
	let modal = $state();
	const dateFormat = new Intl.DateTimeFormat("en-GB", {
		day: "numeric",
		month: "long",
		year: "numeric",
		timeZone: "UTC"
	});

	async function retry() {
		retrying = true;
		try {
			await invalidate("app:catalogue");
		} finally {
			retrying = false;
		}
	}

	function openVisualisation(visualisation) {
		selected = visualisation;
		modal.showModal();
	}
</script>

<Header compact width="full" />
<Main>
	<Container width="full" marginTop marginBottom>
		<div class="gallery-heading">
			<h1>ONS visualisations</h1>
			{#if !data.loading && !data.error}
				<p class="gallery-count">
					Latest example of each chart type ({data.visualisations.length})
				</p>
			{/if}
		</div>

		{#if data.loading}
			<p role="status">Loading visualisations...</p>
		{:else if data.error}
			<Notice mode="error">
				<p role="alert">{data.error}</p>
				<Button variant="secondary" onClick={retry} disabled={retrying}>
					{retrying ? "Loading..." : "Try again"}
				</Button>
			</Notice>
		{:else if data.visualisations.length === 0}
			<Notice><p>No visualisations are currently available.</p></Notice>
		{:else}
			<div class="gallery" use:masonry={data.visualisations}>
				{#each data.visualisations as visualisation (visualisation.chartType)}
					<article class="visualisation">
						<VisualisationPreview url={visualisation.screenshotUrl} title={visualisation.label} />
						<button
							class="preview-trigger"
							type="button"
							aria-label={`Open ${visualisation.label}`}
							aria-haspopup="dialog"
							onclick={() => openVisualisation(visualisation)}
						></button>
					</article>
				{/each}
			</div>
		{/if}

		<noscript><p>Enable JavaScript to load the latest visualisations.</p></noscript>
		<p class="source">
			Source: <a href="https://github.com/ONSdigital/onsvisualjournalism-backend">
				Office for National Statistics visualisation catalogue
			</a>
		</p>
	</Container>
</Main>
<Footer compact width="full" />

<dialog
	bind:this={modal}
	class="visualisation-modal"
	aria-label={selected?.label ?? "Visualisation"}
	onclose={() => {
		if (!modal.open) selected = null;
	}}
	onkeydown={(event) => {
		if (event.key === "Escape") {
			event.preventDefault();
			modal.close();
		}
	}}
>
	<div class="modal-toolbar">
		<Button variant="secondary" onClick={() => modal.close()}>Close visualisation</Button>
	</div>
	<div class="modal-content">
		{#if selected}
			{#key selected.chartType}
				<div class="embed-frame">
					<EmbedParent
						href={selected.url}
						title={selected.label}
						onLoad={({ pymParent }) => {
							pymParent.iframe.height = "1400";
							pymParent.sendMessage("width", "700");
						}}
					/>
				</div>
			{/key}
		{/if}
	</div>
</dialog>

<style>
	.gallery-heading {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 8px 24px;
		margin-bottom: 24px;
	}

	h1 {
		margin: 0;
		font-size: 28px;
	}

	.gallery-count {
		margin: 0;
		color: #595959;
		font-size: 16px;
	}

	.gallery {
		--gallery-columns: 1;
		position: relative;
		display: grid;
		grid-template-columns: repeat(var(--gallery-columns), minmax(0, 1fr));
		align-items: start;
		gap: 28px 16px;
	}

	.visualisation {
		position: relative;
		min-width: 0;
		box-shadow: 3px 3px 3px 3px #ccc;
	}

	.preview-trigger {
		position: absolute;
		inset: 0;
		width: 100%;
		border: 0;
		padding: 0;
		background: transparent;
		cursor: pointer;
	}

	.preview-trigger:focus-visible {
		outline: 3px solid #206095;
		outline-offset: 3px;
	}

	.visualisation-modal {
		width: 700px;
		max-width: calc(100vw - 32px);
		max-height: min(700px, calc(100dvh - 32px));
		margin: auto;
		padding: 0;
		border: 0;
		overflow: hidden;
		background: #fff;
	}

	.visualisation-modal[open] {
		display: flex;
		flex-direction: column;
	}

	.visualisation-modal::backdrop {
		background: rgb(0 0 0 / 50%);
	}

	.modal-toolbar {
		display: flex;
		justify-content: flex-end;
		flex-shrink: 0;
		padding: 8px;
	}

	.modal-content {
		min-height: 0;
		overflow: auto;
	}

	.embed-frame {
		width: 700px;
	}

	.embed-frame :global(iframe) {
		display: block;
		width: 100%;
		max-width: none;
		border: 0;
	}

	h2 {
		margin: 12px 0 6px;
		font-size: 16px;
		line-height: 1.4;
		overflow-wrap: anywhere;
	}

	time {
		display: block;
		color: #595959;
		font-size: 14px;
	}

	.source {
		margin-top: 32px;
		font-size: 14px;
	}

	@media (min-width: 480px) {
		.gallery {
			--gallery-columns: 2;
		}
	}

	@media (min-width: 768px) {
		.gallery {
			--gallery-columns: 3;
		}
	}

	@media (min-width: 1200px) {
		.gallery {
			--gallery-columns: 4;
		}
	}
</style>
