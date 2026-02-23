import { type CollectionEntry, getCollection } from "astro:content";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { siteConfig } from "../config";
import {
	type PostVariantGroup,
	getCanonicalPostSlugFromId,
	getPostVariantLanguageKey,
	selectPreferredPostVariant,
} from "./post-variant-utils";
import { getCategoryUrl, getPostUrl } from "@utils/url-utils";
import { initPostIdMap } from "@utils/permalink-utils";

type PostEntry = CollectionEntry<"posts">;

let filteredPostsCache: Promise<PostEntry[]> | null = null;
let groupedPostsCache: Promise<PostVariantGroup[]> | null = null;

function sortPostsForDisplay(a: PostEntry, b: PostEntry) {
	// 首先按置顶状态排序，置顶文章在前
	if (a.data.pinned && !b.data.pinned) return -1;
	if (!a.data.pinned && b.data.pinned) return 1;

	// 如果置顶状态相同，优先按 Priority 排序（数值越小越靠前）
	if (a.data.pinned && b.data.pinned) {
		const priorityA = a.data.priority;
		const priorityB = b.data.priority;
		if (priorityA !== undefined && priorityB !== undefined) {
			if (priorityA !== priorityB) return priorityA - priorityB;
		} else if (priorityA !== undefined) {
			return -1;
		} else if (priorityB !== undefined) {
			return 1;
		}
	}

	// 否则按发布日期排序
	const dateA = new Date(a.data.published);
	const dateB = new Date(b.data.published);
	return dateA > dateB ? -1 : 1;
}

async function getFilteredPosts(): Promise<PostEntry[]> {
	if (!filteredPostsCache) {
		filteredPostsCache = getCollection("posts", ({ data }) => {
			return import.meta.env.PROD ? data.draft !== true : true;
		});
	}
	return filteredPostsCache;
}

function sortVariantsInGroup(variants: PostEntry[]): PostEntry[] {
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

async function getGroupedPosts(): Promise<PostVariantGroup[]> {
	if (!groupedPostsCache) {
		groupedPostsCache = (async () => {
			const allPosts = await getFilteredPosts();
			const grouped = new Map<string, PostEntry[]>();

			for (const post of allPosts) {
				const canonicalId = getCanonicalPostSlugFromId(post);
				const list = grouped.get(canonicalId);
				if (list) {
					list.push(post);
				} else {
					grouped.set(canonicalId, [post]);
				}
			}

			const groups: PostVariantGroup[] = Array.from(grouped.entries()).map(
				([canonicalId, variants]) => {
					const sortedVariants = sortVariantsInGroup(variants);
					const defaultEntry = selectPreferredPostVariant(
						sortedVariants,
						siteConfig.lang,
					);

					return {
						canonicalId,
						variants: sortedVariants,
						defaultEntry,
					};
				},
			);

			groups.sort((a, b) => sortPostsForDisplay(a.defaultEntry, b.defaultEntry));
			return groups;
		})();
	}

	return groupedPostsCache;
}

export async function getSortedPostGroups(): Promise<PostVariantGroup[]> {
	return getGroupedPosts();
}

export async function getPostVariantsForEntry(
	entry: Pick<PostEntry, "id">,
): Promise<PostEntry[]> {
	const groups = await getGroupedPosts();
	const canonicalId = getCanonicalPostSlugFromId(entry);
	const group = groups.find((item) => item.canonicalId === canonicalId);
	return group?.variants ?? [];
}

export async function getSortedPosts(): Promise<PostEntry[]> {
	const groups = await getGroupedPosts();
	const sorted = groups.map((group) => group.defaultEntry);

	for (const post of sorted) {
		post.data.prevSlug = "";
		post.data.prevTitle = "";
		post.data.nextSlug = "";
		post.data.nextTitle = "";
	}

	for (let i = 1; i < sorted.length; i++) {
		sorted[i].data.nextSlug = sorted[i - 1].id;
		sorted[i].data.nextTitle = sorted[i - 1].data.title;
	}
	for (let i = 0; i < sorted.length - 1; i++) {
		sorted[i].data.prevSlug = sorted[i + 1].id;
		sorted[i].data.prevTitle = sorted[i + 1].data.title;
	}

	return sorted;
}

export type PostForList = {
	id: string;
	data: CollectionEntry<"posts">["data"];
	url?: string; // 预计算的文章 URL
};

export async function getSortedPostsList(): Promise<PostForList[]> {
	const sortedFullPosts = await getSortedPosts();

	// 初始化文章 ID 映射（用于 permalink 功能）
	initPostIdMap(sortedFullPosts);

	// delete post.body，并预计算 URL
	const sortedPostsList = sortedFullPosts.map((post) => ({
		id: post.id,
		data: post.data,
		url: getPostUrl(post),
	}));

	return sortedPostsList;
}

export type Tag = {
	name: string;
	count: number;
};

export async function getTagList(): Promise<Tag[]> {
	const allBlogPosts = await getSortedPosts();

	const countMap: { [key: string]: number } = {};
	allBlogPosts.forEach((post: { data: { tags: string[] } }) => {
		post.data.tags.forEach((tag: string) => {
			if (!countMap[tag]) countMap[tag] = 0;
			countMap[tag]++;
		});
	});

	// sort tags
	const keys: string[] = Object.keys(countMap).sort((a, b) => {
		return a.toLowerCase().localeCompare(b.toLowerCase());
	});

	return keys.map((key) => ({ name: key, count: countMap[key] }));
}

export type Category = {
	name: string;
	count: number;
	url: string;
};

export async function getCategoryList(): Promise<Category[]> {
	const allBlogPosts = await getSortedPosts();
	const count: { [key: string]: number } = {};
	allBlogPosts.forEach((post: { data: { category: string | null } }) => {
		if (!post.data.category) {
			const ucKey = i18n(I18nKey.uncategorized);
			count[ucKey] = count[ucKey] ? count[ucKey] + 1 : 1;
			return;
		}

		const categoryName =
			typeof post.data.category === "string"
				? post.data.category.trim()
				: String(post.data.category).trim();

		count[categoryName] = count[categoryName] ? count[categoryName] + 1 : 1;
	});

	const lst = Object.keys(count).sort((a, b) => {
		return a.toLowerCase().localeCompare(b.toLowerCase());
	});

	const ret: Category[] = [];
	for (const c of lst) {
		ret.push({
			name: c,
			count: count[c],
			url: getCategoryUrl(c),
		});
	}
	return ret;
}
