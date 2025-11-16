import type { Element, Root, Text } from "hast";
import { visit } from "unist-util-visit";

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

					if (matchIndex > lastIndex) {
						newChildren.push({
							type: "text",
							value: text.slice(lastIndex, matchIndex),
						} as Text);
					}

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

				if (lastIndex < text.length) {
					newChildren.push({
						type: "text",
						value: text.slice(lastIndex),
					} as Text);
				}

				parent.children.splice(index, 1, ...newChildren);
			},
		);
	};
}
