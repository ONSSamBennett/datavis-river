import { browser } from "$app/environment";
import { catalogueUrl, screenshotIndexUrl, selectVisualisations } from "$lib/catalogue.js";

export async function load({ fetch, depends }) {
	depends("app:catalogue");
	const metadata = {
		pageTitle: "ONS visualisations",
		pageDescription: "The latest data visualisations from the Office for National Statistics."
	};
	if (!browser) {
		return { ...metadata, visualisations: [], loading: true, error: null };
	}

	try {
		const signal = AbortSignal.timeout(20000);
		const [records, screenshotIndex] = await Promise.all(
			[catalogueUrl, screenshotIndexUrl].map(async (url) => {
				const response = await fetch(url, { cache: "no-cache", signal });
				if (!response.ok) throw new Error(`Catalogue request failed: ${response.status}`);
				return response.json();
			})
		);
		const visualisations = selectVisualisations(records, screenshotIndex);
		return { ...metadata, visualisations, loading: false, error: null };
	} catch {
		return {
			...metadata,
			visualisations: [],
			loading: false,
			error: "The visualisation catalogue could not be loaded. Please try again."
		};
	}
}
