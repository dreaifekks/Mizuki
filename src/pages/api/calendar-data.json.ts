import { getSortedPosts } from "../../utils/content-utils";
import { getPostUrl } from "../../utils/url-utils";

export async function getCalendarPostsData(preferredLang?: string | null) {
	const posts = await getSortedPosts(preferredLang);
	return posts.map((post) => {
		const date = new Date(post.data.published);
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");

		return {
			id: post.id,
			title: post.data.title,
			date: `${year}-${month}-${day}`,
			url: getPostUrl(post),
		};
	});
}

export async function GET() {
	const allPostsData = await getCalendarPostsData();

	return new Response(JSON.stringify(allPostsData), {
		headers: {
			"Content-Type": "application/json",
		},
	});
}
