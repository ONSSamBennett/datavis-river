<script>
	import { LazyLoad } from "@onsvisual/svelte-components";

	let { url, title } = $props();
	let width = $state(0);
	let scale = $derived(width / 700);
</script>

<div class="preview" bind:clientWidth={width} inert>
	<LazyLoad initialHeight={0} rootMargin={200}>
		{#if width > 0}
			<iframe
				src={url}
				{title}
				width="700"
				height="1400"
				scrolling="no"
				tabindex="-1"
				style:transform="scale({scale})"
			></iframe>
		{/if}
	</LazyLoad>
</div>

<style>
	.preview {
		position: relative;
		width: 100%;
		aspect-ratio: 1;
		overflow: hidden;
		background: #fff;
		outline: 1px solid #d9d9d9;
		outline-offset: -1px;
	}

	iframe {
		position: absolute;
		top: 0;
		left: 0;
		display: block;
		width: 700px;
		max-width: none;
		height: 1400px;
		border: 0;
		transform-origin: top left;
		pointer-events: none;
	}
</style>
