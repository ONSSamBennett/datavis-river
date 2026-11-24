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
		const visualisations = await selectVisualisations(records, screenshotIndex, async (url) => {
			const response = await fetch(url, { signal });
			if (response.status === 404) return false;
			if (!response.ok) throw new Error(`Screenshot request failed: ${response.status}`);
			const blob = await response.blob();
			if (blob.type !== "image/jpeg") return false;
			try {
				const image = await createImageBitmap(blob);
				image.close();
				return true;
			} catch (error) {
				if (error instanceof DOMException && error.name === "InvalidStateError") return false;
				throw error;
			}
		});
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
