<script>
	import { invalidate } from "$app/navigation";
	import { Button, Container, Footer, Header, Main, Notice } from "@onsvisual/svelte-components";
	import VisualisationPreview from "$lib/VisualisationPreview.svelte";

	let { data } = $props();
	let retrying = $state(false);
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
</script>

<Header compact width="full" />
<Main>
	<Container width="full" marginTop marginBottom>
		<div class="gallery-heading">
			<h1>ONS visualisations</h1>
			{#if !data.loading && !data.error}
				<p class="gallery-count">Latest {data.visualisations.length}</p>
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
			<div class="gallery">
				{#each data.visualisations as visualisation (visualisation.url)}
					<article class="visualisation">
						<VisualisationPreview url={visualisation.url} title={visualisation.label} />
						<h2>
							<a href={visualisation.url} aria-label={visualisation.label}>
								{visualisation.title}
							</a>
						</h2>
						<time datetime={visualisation.date}>
							{dateFormat.format(new Date(visualisation.date))}
						</time>
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
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 28px 16px;
	}

	.visualisation {
		min-width: 0;
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
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (min-width: 768px) {
		.gallery {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}

	@media (min-width: 1200px) {
		.gallery {
			grid-template-columns: repeat(5, minmax(0, 1fr));
		}
	}
</style>
