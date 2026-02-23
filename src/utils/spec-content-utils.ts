import { type CollectionEntry, getCollection } from "astro:content";
import { siteConfig } from "../config";
import {
	type PostVariantGroup,
	getCanonicalPostSlugFromId,
	getPostVariantLanguageKey,
	selectPreferredPostVariant,
} from "./post-variant-utils";

type SpecEntry = CollectionEntry<"spec">;

type SpecVariantGroup = {
	canonicalId: string;
	variants: SpecEntry[];
	defaultEntry: SpecEntry;
};

let specGroupsCache: Promise<SpecVariantGroup[]> | null = null;

function sortSpecVariants(variants: SpecEntry[]): SpecEntry[] {
	const preferred = selectPreferredPostVariant(variants, siteConfig.lang);
	const preferredId = preferred.id;

	return [...variants].sort((a, b) => {
		if (a.id === preferredId && b.id !== preferredId) return -1;
		if (b.id === preferredId && a.id !== preferredId) return 1;

		const aLang = getPostVariantLanguageKey(a);
		const bLang = getPostVariantLanguageKey(b);
		if (aLang === "default" && bLang !== "default") return -1;
		if (bLang === "default" && aLang !== "default") return 1;

		return aLang.localeCompare(bLang);
	});
}

async function getSpecVariantGroupsInternal(): Promise<SpecVariantGroup[]> {
	if (!specGroupsCache) {
		specGroupsCache = (async () => {
			const entries = await getCollection("spec");
			const grouped = new Map<string, SpecEntry[]>();

			for (const entry of entries) {
				const canonicalId = getCanonicalPostSlugFromId(entry);
				const group = grouped.get(canonicalId);
				if (group) {
					group.push(entry);
				} else {
					grouped.set(canonicalId, [entry]);
				}
			}

			return Array.from(grouped.entries())
				.map(([canonicalId, variants]) => {
					const sortedVariants = sortSpecVariants(variants);
					return {
						canonicalId,
						variants: sortedVariants,
						defaultEntry: selectPreferredPostVariant(
							sortedVariants,
							siteConfig.lang,
						),
					};
				})
				.sort((a, b) => a.canonicalId.localeCompare(b.canonicalId));
		})();
	}

	return specGroupsCache;
}

export async function getSpecVariantGroupByCanonicalId(
	canonicalId: string,
): Promise<SpecVariantGroup | undefined> {
	const groups = await getSpecVariantGroupsInternal();
	return groups.find((group) => group.canonicalId === canonicalId);
}

export type { SpecVariantGroup, PostVariantGroup };
