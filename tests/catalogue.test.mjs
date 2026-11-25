import assert from "node:assert/strict";
import test from "node:test";
import { selectVisualisations, screenshotsUrl } from "../src/lib/catalogue.js";

function screenshot(filename = "chart.jpg") {
	return { filename, last_success: { width: 700, height: 600 } };
}

function publication(date, vis) {
	return { release_date: date, title: `Publication ${date}`, vis };
}

function chart(chart_type, url) {
	return { chart_type, url };
}

function indexFor(records) {
	return {
		version: 1,
		charts: Object.fromEntries(
			records.flatMap(({ vis }) =>
				vis.map(({ url }) => [new URL(url, "https://www.ons.gov.uk").href, screenshot()])
			)
		)
	};
}

test("includes every JPG-backed visualisation newest-first regardless of chart type", () => {
	const records = [
		publication("2026-01-01", [chart("bar", "/old-bar"), chart("line", "/old-line")]),
		publication("2026-03-01", [chart("bar", "/new-bar")]),
		publication("2026-02-01", [
			chart("line", "/new-line"),
			chart(null, "/null"),
			chart("", "/blank"),
			chart("undefined", "/undefined"),
			{ url: "/untyped" }
		])
	];
	const results = selectVisualisations(records, indexFor(records));
	assert.deepEqual(
		results.map(({ date, url }) => [date, new URL(url).pathname]),
		[
			["2026-03-01", "/new-bar"],
			["2026-02-01", "/new-line"],
			["2026-02-01", "/null"],
			["2026-02-01", "/blank"],
			["2026-02-01", "/undefined"],
			["2026-02-01", "/untyped"],
			["2026-01-01", "/old-bar"],
			["2026-01-01", "/old-line"]
		]
	);
	assert.equal(results[0].title, "Publication 2026-03-01");
	assert.equal(results[0].label, "Publication 2026-03-01, visualisation 1");
	assert.equal(results[4].label, "Publication 2026-02-01, visualisation 4");
	assert.equal(results[0].width, 700);
	assert.equal(results[0].height, 600);
});

test("preserves catalogue and visualisation order for equal publication dates", () => {
	const records = [
		publication("2026-01-01", [chart("bar", "/first"), chart("bar", "/second")]),
		publication("2026-01-01", [chart("bar", "/third")])
	];
	assert.deepEqual(
		selectVisualisations(records, indexFor(records)).map(({ url }) => new URL(url).pathname),
		["/first", "/second", "/third"]
	);
});

test("does not cap results or suppress occurrences that share a type or URL", () => {
	const records = [
		publication(
			"2026-01-01",
			Array.from({ length: 65 }, () => chart("bar", "/shared"))
		)
	];
	assert.equal(selectVisualisations(records, indexFor(records)).length, 65);
});

test("preserves validation errors for metadata, indexes and visualisation URLs", () => {
	assert.throws(() => selectVisualisations({}, { version: 1, charts: {} }), /must be an array/);
	assert.throws(() => selectVisualisations([], { charts: {} }), /index is invalid/);
	assert.throws(
		() => selectVisualisations([publication("2026-02-30", [])], { version: 1, charts: {} }),
		/invalid catalogue metadata/
	);
	for (const [url, message] of [
		["", /missing its URL/],
		["https://example.com/chart", /unsupported URL/]
	]) {
		assert.throws(
			() =>
				selectVisualisations([publication("2026-01-01", [{ url }])], { version: 1, charts: {} }),
			message
		);
	}
	const records = [publication("2026-01-01", [{ url: "http://www.ons.gov.uk/chart" }])];
	assert.equal(
		selectVisualisations(records, indexFor(records))[0].url,
		"https://www.ons.gov.uk/chart"
	);
});

test("omits unindexed, unsuccessful, unsafe and non-JPG screenshots without fetching images", () => {
	const records = [
		publication(
			"2026-01-01",
			["unindexed", "failed", "unsafe", "png", "valid", "older"].map((name) =>
				chart("bar", `/${name}`)
			)
		)
	];
	const results = selectVisualisations(records, {
		version: 1,
		charts: {
			"https://www.ons.gov.uk/failed": { filename: "failed.jpg", last_success: null },
			"https://www.ons.gov.uk/unsafe": screenshot("../other.jpg"),
			"https://www.ons.gov.uk/png": screenshot("chart.png"),
			"https://www.ons.gov.uk/valid": screenshot("valid.jpg"),
			"https://www.ons.gov.uk/older": screenshot("older.JPG")
		}
	});
	assert.deepEqual(
		results.map(({ screenshotUrl }) => screenshotUrl),
		[`${screenshotsUrl}valid.jpg`, `${screenshotsUrl}older.JPG`]
	);
});

test("uses exact indexed URLs and retained captures, including collision suffixes", () => {
	const url = "https://www.ons.gov.uk/visualisations/dvc1/Fig01/index.html?version=2#chart";
	const results = selectVisualisations(
		[publication("2026-01-01", [chart("bar", url.toLowerCase()), chart("bar", url)])],
		{
			version: 1,
			charts: {
				[url]: {
					...screenshot("dvc1-fig01-a1b2c3d4.jpg"),
					last_attempt: { status: "failed" }
				}
			}
		}
	);
	assert.equal(results.length, 1);
	assert.equal(results[0].url, url);
	assert.equal(results[0].screenshotUrl, `${screenshotsUrl}dvc1-fig01-a1b2c3d4.jpg`);
});

test("keeps indexed JPGs without usable dimensions for lazy-loading placeholders", () => {
	for (const last_success of [{}, { width: 0, height: 600 }, { width: 700, height: -1 }]) {
		const results = selectVisualisations([publication("2026-01-01", [{ url: "/chart" }])], {
			version: 1,
			charts: { "https://www.ons.gov.uk/chart": { filename: "chart.jpg", last_success } }
		});
		assert.equal(results.length, 1);
		assert.equal(results[0].width, undefined);
		assert.equal(results[0].height, undefined);
	}
});
