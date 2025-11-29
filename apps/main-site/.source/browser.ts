// @ts-nocheck
import { browser } from "fumadocs-mdx/runtime/browser";
import type * as Config from "../source.config";

const create = browser<
	typeof Config,
	import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
		DocData: {};
	}
>();
const browserCollections = {
	blog: create.doc("blog", {
		"building-community-knowledge-base.mdx": () =>
			import(
				"../content/blog/building-community-knowledge-base.mdx?collection=blog"
			),
		"seo-for-discord-communities.mdx": () =>
			import("../content/blog/seo-for-discord-communities.mdx?collection=blog"),
		"welcome-to-answeroverflow.mdx": () =>
			import("../content/blog/welcome-to-answeroverflow.mdx?collection=blog"),
	}),
};
export default browserCollections;
