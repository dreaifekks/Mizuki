/**
 * 获取语言的显示名称
 * @param langCode 语言代码（配置文件格式或翻译服务格式）
 * @returns 语言的显示名称
 */
export function getLanguageDisplayName(langCode: string): string {
	const languageNames: Record<string, string> = {
		zh_CN: "简体中文",
		zh_TW: "繁體中文",
		en: "English",
		ja: "日本語",
		ko: "한국어",
		es: "Español",
		th: "ไทย",
		vi: "Tiếng Việt",
		tr: "Türkçe",
		id: "Bahasa Indonesia",
		fr: "Français",
		de: "Deutsch",
		ru: "Русский",
		ar: "العربية",
		// 翻译服务格式
		chinese_simplified: "简体中文",
		chinese_traditional: "繁體中文",
		english: "English",
		japanese: "日本語",
		korean: "한국어",
		spanish: "Español",
		thai: "ไทย",
		vietnamese: "Tiếng Việt",
		turkish: "Türkçe",
		indonesian: "Bahasa Indonesia",
		french: "Français",
		german: "Deutsch",
		russian: "Русский",
		arabic: "العربية",
	};

	const normalized = String(langCode || "").trim();
	if (!normalized) return "";

	const normalizedUnderscore = normalized.toLowerCase().replace(/-/g, "_");
	const aliasMap: Record<string, string> = {
		cn: "zh_CN",
		tw: "zh_TW",
		jp: "ja",
		ja_jp: "ja",
		en_us: "en",
		en_gb: "en",
		en_au: "en",
		zh_cn: "zh_CN",
		zh_tw: "zh_TW",
		zh_hans: "zh_CN",
		zh_sg: "zh_CN",
		zh_hant: "zh_TW",
		zh_hk: "zh_TW",
		zh_mo: "zh_TW",
	};

	const candidates = [
		normalized,
		aliasMap[normalizedUnderscore],
		normalizedUnderscore,
	].filter(Boolean);

	for (const candidate of candidates) {
		const displayName = languageNames[candidate];
		if (displayName) return displayName;
	}

	return normalized;
}
