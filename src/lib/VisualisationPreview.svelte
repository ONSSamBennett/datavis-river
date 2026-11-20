<script>
	import { EmbedParent, LazyLoad } from "@onsvisual/svelte-components";

	let { url, title, preview = true } = $props();
	let width = $state(0);
	let parent = $state(null);
	let frameWidth = $derived(preview ? 700 : Math.min(700, width || 700));
	let scale = $derived(preview ? width / frameWidth : 1);

	function initialise({ pymParent }) {
		parent = pymParent;
		pymParent.iframe.height = "1400";
		if (preview) pymParent.iframe.tabIndex = -1;
	}

	$effect(() => {
		parent?.sendMessage("width", String(frameWidth));
	});
</script>

{#snippet frame()}
	<div class="frame" style:width="{frameWidth}px" style:transform="scale({scale})">
		<EmbedParent href={url} {title} onLoad={initialise} />
	</div>
{/snippet}

<div class:preview bind:clientWidth={width} inert={preview}>
	{#if preview}
		<LazyLoad initialHeight={0} rootMargin={200}>
			{#if width > 0}{@render frame()}{/if}
		</LazyLoad>
	{:else}
		{@render frame()}
	{/if}
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

	.frame {
		transform-origin: top left;
	}

	.preview .frame {
		position: absolute;
		top: 0;
		left: 0;
		pointer-events: none;
	}

	.frame :global(iframe) {
		display: block;
		width: 100%;
		max-width: none;
		border: 0;
	}
</style>
