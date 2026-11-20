import assert from "node:assert/strict";
import test from "node:test";
import { selectVisualisations } from "../src/lib/catalogue.js";

function publication(date, vis) {
	return { release_date: date, title: `Publication ${date}`, vis };
}

function chart(chart_type, url) {
	return { chart_type, url };
}

test("selects the latest publication per distinct type and orders results newest-first", () => {
	const results = selectVisualisations([
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

test("ignores undefined types before checking their URLs and trims defined types", () => {
	const results = selectVisualisations([
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
	assert.deepEqual(selectVisualisations([publication("2026-01-01", [chart(null)])]), []);
});

test("breaks publication date ties using catalogue and visualisation order", () => {
	const results = selectVisualisations([
		publication("2026-01-01", [chart("bar-chart", "/first"), chart("bar-chart", "/second")]),
		publication("2026-01-01", [chart("bar-chart", "/third")])
	]);

	assert.equal(results.length, 1);
	assert.equal(results[0].url, "https://www.ons.gov.uk/first");
});

test("does not cap distinct types at 60 or suppress types that share a URL", () => {
	const vis = Array.from({ length: 65 }, (_, index) => chart(`type-${index}`, "/shared"));
	const results = selectVisualisations([publication("2026-01-01", vis)]);

	assert.equal(results.length, 65);
	assert.equal(new Set(results.map(({ chartType }) => chartType)).size, 65);
	assert.ok(results.every(({ url }) => url === "https://www.ons.gov.uk/shared"));
});

test("preserves validation errors for publication metadata and typed visualisations", () => {
	assert.throws(() => selectVisualisations({}), /catalogue must be an array/);
	assert.throws(
		() => selectVisualisations([publication("2026-02-30", [])]),
		/invalid catalogue metadata/
	);
	assert.throws(
		() => selectVisualisations([publication("2026-01-01", [chart("bar-chart", "")])]),
		/missing its URL/
	);
	assert.throws(
		() =>
			selectVisualisations([
				publication("2026-01-01", [chart("bar-chart", "https://example.com/chart")])
			]),
		/unsupported URL/
	);
	assert.equal(
		selectVisualisations([
			publication("2026-01-01", [chart("bar-chart", "http://www.ons.gov.uk/chart")])
		])[0].url,
		"https://www.ons.gov.uk/chart"
	);
});
