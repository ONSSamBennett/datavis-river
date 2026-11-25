<script>
	let { url, title } = $props();
</script>

<div class="preview">
	<img src={url} alt={title} decoding="async" />
</div>

<style>
	.preview {
		width: 100%;
		background: #fff;
		outline: 1px solid #d9d9d9;
		outline-offset: -1px;
	}

	img {
		display: block;
		width: 100%;
		height: auto;
	}
</style>
