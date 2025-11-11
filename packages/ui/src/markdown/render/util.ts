/** biome-ignore lint/suspicious/noExplicitAny: simple-markdown AST nodes don't have proper types */
export function flattenAst(node: any, parent?: any) {
	if (Array.isArray(node)) {
		for (let n = 0; n < node.length; n++) {
			node[n] = flattenAst(node[n], parent);
		}

		return node;
	}

	if (node.content != null) {
		node.content = flattenAst(node.content, node);
	}

	if (parent != null && node.type === parent.type) {
		return node.content;
	}

	return node;
}

/** biome-ignore lint/suspicious/noExplicitAny: simple-markdown AST nodes don't have proper types */
export function astToString(node: any) {
	/** biome-ignore lint/suspicious/noExplicitAny: simple-markdown AST nodes don't have proper types */
	function inner(node: any, result: string[] = []) {
		if (Array.isArray(node)) {
			node.forEach((subNode) => inner(subNode, result));
		} else if (typeof node.content === "string") {
			result.push(node.content);
		} else if (node.content != null) {
			inner(node.content, result);
		}

		return result;
	}

	return inner(node).join("");
}

/** biome-ignore lint/suspicious/noExplicitAny: simple-markdown AST nodes don't have proper types */
export const recurse = (node: any, recurseOutput: any, state: any) =>
	typeof node.content === "string"
		? node.content
		: recurseOutput(node.content, state);
