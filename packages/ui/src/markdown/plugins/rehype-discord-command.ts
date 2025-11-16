import type { Element, Root, Text } from "hast";
import { visit } from "unist-util-visit";

export function rehypeDiscordCommand() {
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
				const commandRegex = /<\/([^:>]+):(\d{17,19})>/g;
				const matches = Array.from(text.matchAll(commandRegex));

				if (matches.length === 0) {
					return;
				}

				const newChildren: Array<Text | Element> = [];
				let lastIndex = 0;

				for (const match of matches) {
					const matchIndex = match.index ?? 0;
					const [fullMatch, commandName] = match;

					if (matchIndex > lastIndex) {
						newChildren.push({
							type: "text",
							value: text.slice(lastIndex, matchIndex),
						} as Text);
					}

					const commandElement: Element = {
						type: "element",
						tagName: "span",
						properties: {
							className: "text-blue-600 dark:text-blue-400 font-medium",
						},
						children: [
							{
								type: "text",
								value: `/${commandName}`,
							} as Text,
						],
					};

					newChildren.push(commandElement);
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
