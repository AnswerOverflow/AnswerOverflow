import type { Image, Link, Parent, Root, Text } from "mdast";
import { visit } from "unist-util-visit";

export function remarkDiscordImage() {
	return (tree: Root) => {
		// @ts-expect-error TODO: Fix this
		visit(tree, "image", (node: Image, index: number, parent: Parent) => {
			if (!parent || typeof index !== "number") return;

			const textNode: Text = {
				type: "text",
				value: "!",
			};

			const linkNode: Link = {
				type: "link",
				url: node.url,
				title: node.title ?? undefined,
				children: [
					{
						type: "text",
						value: node.alt ?? node.url,
					} as Text,
				],
			};

			parent.children.splice(index, 1, textNode, linkNode);
		});
	};
}
