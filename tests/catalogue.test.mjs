import assert from "node:assert/strict";
import test from "node:test";
import {
	selectVisualisations as selectCatalogueVisualisations,
	screenshotsUrl
} from "../src/lib/catalogue.js";

function screenshot(filename = "chart.jpg") {
	return { filename, last_success: { width: 700, height: 600 } };
}

function selectVisualisations(records, index, isScreenshotValid = async () => true) {
	const charts = {};
	if (Array.isArray(records)) {
		for (const record of records) {
			for (const vis of record.vis ?? []) {
				if (vis.url) charts[new URL(vis.url, "https://www.ons.gov.uk").href] = screenshot();
			}
		}
	}
	return selectCatalogueVisualisations(records, index ?? { version: 1, charts }, isScreenshotValid);
}

function publication(date, vis) {
	return { release_date: date, title: `Publication ${date}`, vis };
}

function chart(chart_type, url) {
	return { chart_type, url };
}

test("selects the latest publication per distinct type and orders results newest-first", async () => {
	const results = await selectVisualisations([
		publication("2026-01-01", [chart("bar-chart", "/old-bar"), chart("line-chart", "/old-line")]),
		publication("2026-03-01", [chart("bar-chart", "/new-bar")]),
		publication("2026-02-01", [
			chart("line-chart", "/new-line"),
			chart("line-chart-with-dropdown", "/dropdown")
		])
	]);

	assert.deepEqual(
		results.map(({ chartType, date, url }) => ({ chartType, date, url })),
		[
			{ chartType: "bar-chart", date: "2026-03-01", url: "https://www.ons.gov.uk/new-bar" },
			{ chartType: "line-chart", date: "2026-02-01", url: "https://www.ons.gov.uk/new-line" },
			{
				chartType: "line-chart-with-dropdown",
				date: "2026-02-01",
				url: "https://www.ons.gov.uk/dropdown"
			}
		]
	);
	assert.equal(results[0].title, "Publication 2026-03-01");
	assert.equal(results[0].label, "Publication 2026-03-01, visualisation 1");
});

test("ignores undefined types before checking their URLs and trims defined types", async () => {
	const results = await selectVisualisations([
		publication("2026-01-01", [
			{},
			chart(null, "https://example.com"),
			chart("", ""),
			chart("   ", null),
			chart(" undefined ", "invalid"),
			chart(" bar-chart ", "/bar"),
			chart("bar-chart", "/other-bar")
		])
	]);

	assert.equal(results.length, 1);
	assert.equal(results[0].chartType, "bar-chart");
	assert.equal(results[0].url, "https://www.ons.gov.uk/bar");
	assert.equal(results[0].label, "Publication 2026-01-01, visualisation 6");
	assert.deepEqual(await selectVisualisations([publication("2026-01-01", [chart(null)])]), []);
});

test("breaks publication date ties using catalogue and visualisation order", async () => {
	const results = await selectVisualisations([
		publication("2026-01-01", [chart("bar-chart", "/first"), chart("bar-chart", "/second")]),
		publication("2026-01-01", [chart("bar-chart", "/third")])
	]);

	assert.equal(results.length, 1);
	assert.equal(results[0].url, "https://www.ons.gov.uk/first");
});

test("does not cap distinct types at 60 or suppress types that share a URL", async () => {
	const vis = Array.from({ length: 65 }, (_, index) => chart(`type-${index}`, "/shared"));
	const results = await selectVisualisations([publication("2026-01-01", vis)]);

	assert.equal(results.length, 65);
	assert.equal(new Set(results.map(({ chartType }) => chartType)).size, 65);
	assert.ok(results.every(({ url }) => url === "https://www.ons.gov.uk/shared"));
});

test("preserves validation errors for publication metadata and typed visualisations", async () => {
	await assert.rejects(() => selectVisualisations({}), /catalogue must be an array/);
	await assert.rejects(
		() => selectVisualisations([publication("2026-02-30", [])]),
		/invalid catalogue metadata/
	);
	await assert.rejects(
		() => selectVisualisations([publication("2026-01-01", [chart("bar-chart", "")])]),
		/missing its URL/
	);
	await assert.rejects(
		() =>
			selectVisualisations([
				publication("2026-01-01", [chart("bar-chart", "https://example.com/chart")])
			]),
		/unsupported URL/
	);
	assert.equal(
		(
			await selectVisualisations([
				publication("2026-01-01", [chart("bar-chart", "http://www.ons.gov.uk/chart")])
			])
		)[0].url,
		"https://www.ons.gov.uk/chart"
	);
});

test("falls back to the newest valid JPG per type and omits unavailable types", async () => {
	const index = {
		version: 1,
		charts: {
			"https://www.ons.gov.uk/failed": { filename: "failed.jpg", last_success: null },
			"https://www.ons.gov.uk/missing": screenshot("missing.jpg"),
			"https://www.ons.gov.uk/corrupt": screenshot("corrupt.jpg"),
			"https://www.ons.gov.uk/older": screenshot("older.jpg"),
			"https://www.ons.gov.uk/line": screenshot("line.jpg"),
			"https://www.ons.gov.uk/oldest": screenshot("oldest.jpg")
		}
	};
	const checked = [];
	const results = await selectVisualisations(
		[
			publication("2026-03-01", [
				chart("bar", "/unindexed"),
				chart("bar", "/failed"),
				chart("bar", "/missing"),
				chart("bar", "/corrupt"),
				chart("unavailable", "/no-image")
			]),
			publication("2026-01-01", [chart("bar", "/oldest")]),
			publication("2026-02-01", [chart("line", "/line"), chart("bar", "/older")])
		],
		index,
		async (url) => {
			checked.push(url);
			return !["missing.jpg", "corrupt.jpg"].some((name) => url.endsWith(name));
		}
	);
	assert.deepEqual(
		results.map(({ chartType, date, screenshotUrl }) => ({ chartType, date, screenshotUrl })),
		[
			{ chartType: "line", date: "2026-02-01", screenshotUrl: `${screenshotsUrl}line.jpg` },
			{ chartType: "bar", date: "2026-02-01", screenshotUrl: `${screenshotsUrl}older.jpg` }
		]
	);
	assert.equal(checked.length, 4);
});

test("uses exact indexed URLs and filenames, including collision suffixes and retained captures", async () => {
	const url = "https://www.ons.gov.uk/visualisations/dvc1/Fig01/index.html?version=2#chart";
	const results = await selectVisualisations(
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

test("rejects invalid indexes, skips unsafe or non-JPG names and caches image checks", async () => {
	await assert.rejects(() => selectVisualisations([], { charts: {} }), /index is invalid/);
	let checks = 0;
	const results = await selectVisualisations(
		[
			publication("2026-01-01", [
				chart("bar", "/unsafe"),
				chart("bar", "/png"),
				chart("bar", "/valid"),
				chart("line", "/valid")
			])
		],
		{
			version: 1,
			charts: {
				"https://www.ons.gov.uk/unsafe": screenshot("../other.jpg"),
				"https://www.ons.gov.uk/png": screenshot("chart.png"),
				"https://www.ons.gov.uk/valid": screenshot("valid.jpg")
			}
		},
		async () => {
			checks += 1;
			return true;
		}
	);
	assert.equal(results.length, 2);
	assert.equal(checks, 1);
	await assert.rejects(
		() =>
			selectVisualisations(
				[publication("2026-01-01", [chart("bar", "/valid")])],
				undefined,
				async () => {
					throw new Error("Network unavailable");
				}
			),
		/Network unavailable/
	);
});
