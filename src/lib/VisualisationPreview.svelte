<script>
	import { LazyLoad } from "@onsvisual/svelte-components";

	let { url, title, width = 700, height = 600 } = $props();
	let failed = $state(false);
	let previewWidth = $state(0);
</script>

<div class="preview">
	{#if failed}
		<p role="status">Preview unavailable for {title}. Open the visualisation to view it.</p>
	{:else}
		<div bind:clientWidth={previewWidth} style:aspect-ratio={`${width} / ${height}`}>
			<LazyLoad initialHeight={Math.max(1, (previewWidth * height) / width)}>
				<img
					src={url}
					alt={title}
					{width}
					{height}
					decoding="async"
					onerror={() => (failed = true)}
				/>
			</LazyLoad>
		</div>
	{/if}
</div>

<style>
	.preview {
		width: 100%;
		background: #fff;
		outline: 1px solid #d9d9d9;
		outline-offset: -1px;
		padding: 5px;
	}

	img {
		display: block;
		width: 100%;
		height: auto;
	}
</style>
