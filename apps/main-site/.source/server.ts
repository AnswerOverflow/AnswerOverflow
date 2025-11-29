// @ts-nocheck
import * as __fd_glob_2 from "../content/blog/welcome-to-answeroverflow.mdx?collection=blog";
import * as __fd_glob_1 from "../content/blog/seo-for-discord-communities.mdx?collection=blog";
import * as __fd_glob_0 from "../content/blog/building-community-knowledge-base.mdx?collection=blog";
import { server } from "fumadocs-mdx/runtime/server";
import type * as Config from "../source.config";

const create = server<
	typeof Config,
	import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
		DocData: {};
	}
>({ doc: { passthroughs: ["extractedReferences"] } });

export const blog = await create.doc("blog", "content/blog", {
	"building-community-knowledge-base.mdx": __fd_glob_0,
	"seo-for-discord-communities.mdx": __fd_glob_1,
	"welcome-to-answeroverflow.mdx": __fd_glob_2,
});
