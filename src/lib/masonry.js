/**
 * @param {number[]} heights
 * @param {number} columns
 * @param {number} columnWidth
 * @param {number} columnGap
 * @param {number} rowGap
 */
export function layoutMasonry(heights, columns, columnWidth, columnGap, rowGap) {
	const bottoms = Array(columns).fill(0);
	const positions = heights.map((height) => {
		const column = bottoms.indexOf(Math.min(...bottoms));
		const top = bottoms[column];
		bottoms[column] = top + height + rowGap;
		return { left: column * (columnWidth + columnGap), top };
	});

	return {
		positions,
		height: heights.length ? Math.max(...bottoms) - rowGap : 0
	};
}

/** @type {import("svelte/action").Action<HTMLElement, unknown>} */
export function masonry(node, _items) {
	/** @type {HTMLElement[]} */
	let cards = [];
	let frame = 0;
	const observer = new ResizeObserver(schedule);

	function layout() {
		frame = 0;
		const width = node.getBoundingClientRect().width;
		if (width === 0) return;

		const style = getComputedStyle(node);
		const columns = Number(style.getPropertyValue("--gallery-columns"));
		const columnGap = Number.parseFloat(style.columnGap);
		const rowGap = Number.parseFloat(style.rowGap);
		const columnWidth = (width - columnGap * (columns - 1)) / columns;
		for (const card of cards) card.style.width = `${columnWidth}px`;

		const heights = cards.map((card) => card.getBoundingClientRect().height);
		const { positions, height } = layoutMasonry(heights, columns, columnWidth, columnGap, rowGap);
		cards.forEach((card, index) => {
			card.style.position = "absolute";
			card.style.left = `${positions[index].left}px`;
			card.style.top = `${positions[index].top}px`;
		});
		node.style.height = `${height}px`;
	}

	function schedule() {
		if (!frame) frame = requestAnimationFrame(layout);
	}

	function refresh() {
		observer.disconnect();
		cards = Array.from(node.children).filter((child) => child instanceof HTMLElement);
		observer.observe(node);
		for (const card of cards) observer.observe(card);
		schedule();
	}

	refresh();

	return {
		update: refresh,
		destroy() {
			observer.disconnect();
			cancelAnimationFrame(frame);
			node.style.removeProperty("height");
			for (const card of cards) {
				for (const property of ["position", "width", "left", "top"]) {
					card.style.removeProperty(property);
				}
			}
		}
	};
}
