import assert from "node:assert/strict";
import test from "node:test";
import { layoutMasonry } from "../src/lib/masonry.js";

test("places mixed-height cards in the shortest column with leftmost ties", () => {
	assert.deepEqual(layoutMasonry([300, 100, 180, 90, 50], 3, 200, 16, 28), {
		positions: [
			{ left: 0, top: 0 },
			{ left: 216, top: 0 },
			{ left: 432, top: 0 },
			{ left: 216, top: 128 },
			{ left: 432, top: 208 }
		],
		height: 300
	});
	assert.deepEqual(layoutMasonry([100, 100, 80, 60], 2, 200, 16, 28), {
		positions: [
			{ left: 0, top: 0 },
			{ left: 216, top: 0 },
			{ left: 0, top: 128 },
			{ left: 216, top: 128 }
		],
		height: 208
	});
});

test("reflows the same chronological sequence for different column counts", () => {
	const heights = [300, 100, 180, 90];
	assert.deepEqual(layoutMasonry(heights, 2, 300, 16, 28), {
		positions: [
			{ left: 0, top: 0 },
			{ left: 316, top: 0 },
			{ left: 316, top: 128 },
			{ left: 0, top: 328 }
		],
		height: 418
	});
	assert.deepEqual(layoutMasonry(heights, 4, 140, 16, 28), {
		positions: [
			{ left: 0, top: 0 },
			{ left: 156, top: 0 },
			{ left: 312, top: 0 },
			{ left: 468, top: 0 }
		],
		height: 300
	});
});

test("keeps a single column strictly in input order without a trailing gap", () => {
	assert.deepEqual(layoutMasonry([300.5, 100, 180], 1, 360, 16, 28), {
		positions: [
			{ left: 0, top: 0 },
			{ left: 0, top: 328.5 },
			{ left: 0, top: 456.5 }
		],
		height: 636.5
	});
});

test("handles an empty gallery or fewer cards than columns without adding space", () => {
	assert.deepEqual(layoutMasonry([], 4, 200, 16, 28), { positions: [], height: 0 });
	assert.deepEqual(layoutMasonry([80, 120], 4, 200, 16, 28), {
		positions: [
			{ left: 0, top: 0 },
			{ left: 216, top: 0 }
		],
		height: 120
	});
});
