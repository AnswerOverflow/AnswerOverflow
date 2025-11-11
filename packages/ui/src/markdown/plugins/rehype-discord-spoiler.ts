import type { Element, Root, Text } from "hast";
import { visit } from "unist-util-visit";

/**
 * Rehype plugin to convert Discord spoiler syntax (||text||) to span elements with spoiler styling
 */
export function rehypeDiscordSpoiler() {
	return (tree: Root) => {
		visit(
			tree,
			"text",
			(
				node: Text,
				index: number | undefined,
				parent: Element | Root | undefined,
			) => {
				if (!parent || index === undefined || !("children" in parent)) {
					return;
				}

				const text = node.value;
				const spoilerRegex = /\|\|([\s\S]+?)\|\|/g;
				const matches = Array.from(text.matchAll(spoilerRegex));

				if (matches.length === 0) {
					return;
				}

				const newChildren: Array<Text | Element> = [];
				let lastIndex = 0;

				for (const match of matches) {
					const matchIndex = match.index ?? 0;
					const [fullMatch, content] = match;

					// Add text before the match
					if (matchIndex > lastIndex) {
						newChildren.push({
							type: "text",
							value: text.slice(lastIndex, matchIndex),
						} as Text);
					}

					// Create span element for spoiler
					const spoilerElement: Element = {
						type: "element",
						tagName: "span",
						properties: {
							className:
								"bg-black text-black dark:bg-white dark:text-white rounded px-1 cursor-pointer hover:bg-transparent hover:text-inherit transition-colors",
						},
						children: [
							{
								type: "text",
								value: content,
							} as Text,
						],
					};

					newChildren.push(spoilerElement);
					lastIndex = matchIndex + fullMatch.length;
				}

				// Add remaining text after last match
				if (lastIndex < text.length) {
					newChildren.push({
						type: "text",
						value: text.slice(lastIndex),
					} as Text);
				}

				// Replace the text node with new children
				parent.children.splice(index, 1, ...newChildren);
			},
		);
	};
}
