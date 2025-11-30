import { defineCollections, defineConfig } from "fumadocs-mdx/config";
import { z } from "zod";

export const blog = defineCollections({
	type: "doc",
	dir: "content/blog",
	schema: z.object({
		title: z.string(),
		description: z.string(),
		date: z.string().or(z.date()),
		author: z.string().optional(),
		tags: z.array(z.string()).optional(),
		image: z.string().optional(),
	}),
});

export default defineConfig({
	mdxOptions: {
		rehypeCodeOptions: false,
	},
});
