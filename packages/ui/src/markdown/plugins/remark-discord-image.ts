import type { Image, Link, Parent, Root, Text } from "mdast";
import { visit } from "unist-util-visit";

/**
 * Remark plugin to convert markdown images ![alt](url) to ! followed by a link [alt](url)
 * Discord doesn't support markdown images, so we convert them to text + link
 */
export function remarkDiscordImage() {
	return (tree: Root) => {
		visit(tree, "image", (node: Image, index: number, parent: Parent) => {
			if (!parent || typeof index !== "number") return;

			// Create text node with "!"
			const textNode: Text = {
				type: "text",
				value: "!",
			};

			// Create link node with [alt](url)
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

			// Replace the image node with text + link
			parent.children.splice(index, 1, textNode, linkNode);
		});
	};
}
