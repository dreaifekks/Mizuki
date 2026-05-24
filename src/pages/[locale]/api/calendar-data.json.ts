import {
	SUPPORTED_LOCALES,
	type SupportedLocaleLang,
	type SupportedLocalePath,
	setCurrentLocaleContext,
} from "../../../i18n/locale";
import { getCalendarPostsData } from "../../api/calendar-data.json";

interface Props {
	localePath: SupportedLocalePath;
	lang: SupportedLocaleLang;
}

export function getStaticPaths() {
	return SUPPORTED_LOCALES.map((locale) => ({
		params: { locale: locale.path },
		props: { localePath: locale.path, lang: locale.lang },
	}));
}

export async function GET({ props }: { props: Props }) {
	setCurrentLocaleContext(props.localePath, true);
	const allPostsData = await getCalendarPostsData(props.lang);

	return new Response(JSON.stringify(allPostsData), {
		headers: {
			"Content-Type": "application/json",
		},
	});
}
