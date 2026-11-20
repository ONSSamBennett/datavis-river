export const catalogueUrl =
	"https://raw.githubusercontent.com/ONSdigital/onsvisualjournalism-backend/main/data.json";

export function selectVisualisations(records) {
	if (!Array.isArray(records)) throw new Error("The catalogue must be an array.");

	const publications = records.map((record) => {
		const date = record.release_date?.slice(0, 10);
		if (
			!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "") ||
			Number.isNaN(Date.parse(date)) ||
			new Date(date).toISOString().slice(0, 10) !== date ||
			typeof record.title !== "string" ||
			!Array.isArray(record.vis)
		) {
			throw new Error("A publication has invalid catalogue metadata.");
		}
		return { ...record, date };
	});
	publications.sort((first, second) => second.date.localeCompare(first.date));

	const seen = new Set();
	const visualisations = [];
	for (const publication of publications) {
		for (const [index, visualisation] of publication.vis.entries()) {
			const chartType =
				typeof visualisation.chart_type === "string" ? visualisation.chart_type.trim() : "";
			if (!chartType || chartType === "undefined") continue;
			if (typeof visualisation.url !== "string" || !visualisation.url.trim()) {
				throw new Error("A visualisation is missing its URL.");
			}
			const url = new URL(visualisation.url, "https://www.ons.gov.uk");
			if (
				!["http:", "https:"].includes(url.protocol) ||
				!(url.hostname === "ons.gov.uk" || url.hostname.endsWith(".ons.gov.uk")) ||
				url.username ||
				url.password
			) {
				throw new Error("A visualisation has an unsupported URL.");
			}
			url.protocol = "https:";
			if (seen.has(chartType)) continue;
			seen.add(chartType);
			visualisations.push({
				chartType,
				url: url.href,
				title: publication.title,
				date: publication.date,
				label: `${publication.title}, visualisation ${index + 1}`
			});
		}
	}
	return visualisations;
}
