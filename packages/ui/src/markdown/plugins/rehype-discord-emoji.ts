import type { Element, Root, Text } from "hast";
import { visit } from "unist-util-visit";

/**
 * Rehype plugin to convert Discord emoji syntax (<:name:id> and <a:name:id>) to img elements
 */
export function rehypeDiscordEmoji() {
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
				const emojiRegex = /<(a?):([a-zA-Z0-9_-]+):(\d{17,19})>/g;
				const matches = Array.from(text.matchAll(emojiRegex));

				if (matches.length === 0) {
					return;
				}

				const newChildren: Array<Text | Element> = [];
				let lastIndex = 0;

				for (const match of matches) {
					const matchIndex = match.index ?? 0;
					const [fullMatch, animated, name, id] = match;

					// Add text before the match
					if (matchIndex > lastIndex) {
						newChildren.push({
							type: "text",
							value: text.slice(lastIndex, matchIndex),
						} as Text);
					}

					const imgElement: Element = {
						type: "element",
						tagName: "img",
						properties: {
							src: `https://cdn.discordapp.com/emojis/${id}.${animated ? "gif" : "png"}`,
							alt: name,
							className: "inline-block h-[22px] w-[22px]",
							loading: "eager",
						},
						children: [],
					};

					newChildren.push(imgElement);
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
