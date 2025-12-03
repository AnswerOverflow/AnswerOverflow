import type { Element, Root, Text } from "hast";
import { emojify } from "node-emoji";
import { visit } from "unist-util-visit";

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

				let text = emojify(node.value);

				const emojiRegex = /<(a?):([a-zA-Z0-9_-]+):(\d{17,19})>/g;
				const matches = Array.from(text.matchAll(emojiRegex));

				if (matches.length === 0) {
					node.value = text;
					return;
				}

				const newChildren: Array<Text | Element> = [];
				let lastIndex = 0;

				for (const match of matches) {
					const matchIndex = match.index ?? 0;
					const [fullMatch, animated, name, id] = match;

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
