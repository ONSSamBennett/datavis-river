export const catalogueUrl =
	"https://raw.githubusercontent.com/ONSdigital/onsvisualjournalism-backend/main/data.json";
export const screenshotsUrl =
	"https://raw.githubusercontent.com/ONSdigital/onsvisualjournalism-backend/main/screenshots/";
export const screenshotIndexUrl = `${screenshotsUrl}index.json`;

export function selectVisualisations(records, screenshotIndex) {
	if (!Array.isArray(records)) throw new Error("The catalogue must be an array.");
	if (
		screenshotIndex?.version !== 1 ||
		!screenshotIndex.charts ||
		typeof screenshotIndex.charts !== "object" ||
		Array.isArray(screenshotIndex.charts)
	) {
		throw new Error("The screenshot index is invalid.");
	}

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

	const visualisations = [];
	for (const publication of publications) {
		for (const [index, visualisation] of publication.vis.entries()) {
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
			const screenshot = screenshotIndex.charts[url.href];
			if (
				!screenshot?.last_success ||
				typeof screenshot.filename !== "string" ||
				!/^[a-z0-9][a-z0-9._-]*\.jpg$/i.test(screenshot.filename)
			)
				continue;
			const screenshotUrl = `${screenshotsUrl}${screenshot.filename}`;
			url.protocol = "https:";
			const { width, height } = screenshot.last_success;
			const hasDimensions =
				Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0;
			visualisations.push({
				url: url.href,
				screenshotUrl,
				width: hasDimensions ? width : undefined,
				height: hasDimensions ? height : undefined,
				title: publication.title,
				date: publication.date,
				label: `${publication.title}, visualisation ${index + 1}`
			});
		}
	}
	return visualisations;
}
