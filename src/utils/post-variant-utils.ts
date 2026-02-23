import type { CollectionEntry } from "astro:content";
import { siteConfig } from "../config";

const KNOWN_LANG_SUFFIXES = new Set([
	"en",
	"en_us",
	"en_gb",
	"en_au",
	"zh",
	"zh_cn",
	"zh_tw",
	"cn",
	"tw",
	"ja",
	"ja_jp",
	"jp",
	"ko",
	"ko_kr",
	"es",
	"fr",
	"de",
	"ru",
	"it",
	"pt",
	"pt_br",
	"tr",
	"vi",
	"id",
	"th",
	"ar",
]);

function normalizeLangPart(raw: string): string {
	return raw.trim().toLowerCase().replace(/-/g, "_");
}

export function normalizeLanguageCode(raw?: string | null): string {
	if (!raw) return "";
	const normalized = normalizeLangPart(raw);

	if (normalized === "jp") return "ja";
	if (normalized === "ja_jp") return "ja";
	if (normalized === "en_us" || normalized === "en_gb" || normalized === "en_au")
		return "en";
	if (normalized === "cn") return "zh_cn";
	if (normalized === "tw") return "zh_tw";
	if (normalized === "zh_hans" || normalized === "zh_sg") return "zh_cn";
	if (normalized === "zh_hant" || normalized === "zh_hk" || normalized === "zh_mo")
		return "zh_tw";

	return normalized;
}

export function normalizeLanguageCodeLoose(raw?: string | null): string {
	const normalized = normalizeLanguageCode(raw);
	if (!normalized) return "";
	return normalized;
}

function isKnownLanguageSuffix(raw: string): boolean {
	const normalized = normalizeLangPart(raw);
	return KNOWN_LANG_SUFFIXES.has(normalized);
}

function splitPathAndBase(pathWithoutExt: string) {
	const lastSlashIndex = pathWithoutExt.lastIndexOf("/");
	if (lastSlashIndex < 0) {
		return { dir: "", base: pathWithoutExt };
	}
	return {
		dir: pathWithoutExt.slice(0, lastSlashIndex + 1),
		base: pathWithoutExt.slice(lastSlashIndex + 1),
	};
}

function stripMarkdownExtension(id: string): string {
	return id.replace(/\.(md|mdx|markdown)$/i, "");
}

function normalizePathSeparators(value: string): string {
	return value.replace(/\\/g, "/");
}

function getRelativeContentPathFromFilePath(filePath: string): string {
	const normalized = normalizePathSeparators(filePath).replace(/^\.?\//, "");
	const contentMatch = normalized.match(/(?:^|\/)src\/content\/(?:posts|spec)\/(.+)$/i);
	if (contentMatch?.[1]) return contentMatch[1];

	// Fallback for cases where Astro returns a shorter relative path
	const postsOrSpecMatch = normalized.match(/(?:^|\/)(?:posts|spec)\/(.+)$/i);
	if (postsOrSpecMatch?.[1]) return postsOrSpecMatch[1];

	return normalized;
}

export type PostVariantInfo = {
	idWithoutExt: string;
	canonicalId: string;
	variantLang: string;
	variantLangBase: string;
	fileSuffixLang: string;
};

export function getPostVariantInfo(
	post:
		| string
		| {
				id: string;
				filePath?: string | null;
				data?: { lang?: string | null };
		  },
): PostVariantInfo {
	const id = typeof post === "string" ? post : post.id;
	const filePath = typeof post === "string" ? "" : (post.filePath ?? "");
	const frontmatterLang =
		typeof post === "string" ? "" : (post.data?.lang ?? "");
	const pathSource = filePath ? getRelativeContentPathFromFilePath(filePath) : id;
	const idWithoutExt = stripMarkdownExtension(pathSource);
	const { dir, base } = splitPathAndBase(idWithoutExt);

	let canonicalBase = base;
	let fileSuffixLang = "";

	const dotIndex = base.lastIndexOf(".");
	if (dotIndex > 0) {
		const maybeLang = base.slice(dotIndex + 1);
		if (isKnownLanguageSuffix(maybeLang)) {
			fileSuffixLang = normalizeLanguageCodeLoose(maybeLang);
			canonicalBase = base.slice(0, dotIndex);
		}
	}

	const canonicalId = `${dir}${canonicalBase}`;
	const frontmatterLangNormalized = normalizeLanguageCodeLoose(frontmatterLang);
	const variantLang = fileSuffixLang || frontmatterLangNormalized;
	const variantLangBase = variantLang.split("_")[0] || variantLang;

	return {
		idWithoutExt,
		canonicalId,
		variantLang,
		variantLangBase,
		fileSuffixLang,
	};
}

type PostVariantLike = {
	id: string;
	filePath?: string | null;
	data?: { lang?: string | null };
};

export function getCanonicalPostSlugFromId(id: string): string;
export function getCanonicalPostSlugFromId(post: PostVariantLike): string;
export function getCanonicalPostSlugFromId(
	post: string | PostVariantLike,
): string {
	return getPostVariantInfo(post).canonicalId;
}

export function getPostVariantLanguageKey(
	post:
		| string
		| {
				id: string;
				filePath?: string | null;
				data?: { lang?: string | null };
		  },
): string {
	const info = getPostVariantInfo(post);
	return info.variantLang || "default";
}

export function getLanguageCandidateChain(
	preferred?: string | null,
): string[] {
	const values = [
		normalizeLanguageCodeLoose(preferred),
		normalizeLanguageCodeLoose(siteConfig.lang),
		"default",
		"en",
	];

	const expanded: string[] = [];
	for (const value of values) {
		if (!value) continue;
		if (!expanded.includes(value)) expanded.push(value);
		const base = value.split("_")[0];
		if (base && !expanded.includes(base)) expanded.push(base);
	}
	return expanded;
}

export function getBrowserLanguageCandidatesFromNavigator(
	navigatorLike?: { language?: string; languages?: string[] },
): string[] {
	const rawList = navigatorLike?.languages?.length
		? navigatorLike.languages
		: navigatorLike?.language
			? [navigatorLike.language]
			: [];

	const candidates: string[] = [];
	for (const raw of rawList) {
		const normalized = normalizeLanguageCodeLoose(raw);
		if (!normalized) continue;
		if (!candidates.includes(normalized)) candidates.push(normalized);
		const base = normalized.split("_")[0];
		if (base && !candidates.includes(base)) candidates.push(base);
	}
	return candidates;
}

export function selectPreferredPostVariant<
	T extends { id: string; filePath?: string | null; data?: { lang?: string } },
>(
	entries: T[],
	preferredLang?: string | null,
): T {
	if (entries.length === 0) {
		throw new Error("selectPreferredPostVariant requires at least one entry");
	}

	const byLang = new Map<string, T>();
	let defaultEntry: T | undefined;

	for (const entry of entries) {
		const info = getPostVariantInfo(entry);
		const key = info.variantLang || "default";
		if (!byLang.has(key)) {
			byLang.set(key, entry);
		}
		if (!info.variantLang && !defaultEntry) {
			defaultEntry = entry;
		}
	}

	const candidates = getLanguageCandidateChain(preferredLang);
	for (const candidate of candidates) {
		const direct = byLang.get(candidate);
		if (direct) return direct;
	}

	if (defaultEntry) return defaultEntry;
	return entries[0];
}

export type PostVariantGroup = {
	canonicalId: string;
	variants: CollectionEntry<"posts">[];
	defaultEntry: CollectionEntry<"posts">;
};
