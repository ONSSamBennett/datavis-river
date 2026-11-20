import { browser } from "$app/environment";
import { catalogueUrl, selectVisualisations } from "$lib/catalogue.js";

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
		const response = await fetch(catalogueUrl, {
			cache: "no-cache",
			signal: AbortSignal.timeout(20000)
		});
		if (!response.ok) throw new Error(`Catalogue request failed: ${response.status}`);
		const visualisations = selectVisualisations(await response.json());
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
