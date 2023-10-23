export function flattenAst(node, parent?) {
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

export function astToString(node) {
	function inner(node, result = []) {
		if (Array.isArray(node)) {
			node.forEach((subNode) => inner(subNode, result));
		} else if (typeof node.content === 'string') {
			result.push(node.content);
		} else if (node.content != null) {
			inner(node.content, result);
		}

		return result;
	}

	return inner(node).join('');
}

export const recurse = (node, recurseOutput, state) =>
	typeof node.content === 'string'
		? node.content
		: recurseOutput(node.content, state);

export function jumboify(ast) {
	const nonEmojiNodes = ast.some(
		(node) =>
			node.type !== 'img' &&
			(typeof node.content !== 'string' || node.content.trim() !== ''),
	);

	if (nonEmojiNodes) return ast;

	const maximum = 27;
	let count = 0;

	ast.forEach((node, i) => {
		node.props.key = i;

		if (node.type === 'img') count += 1;

		if (count > maximum) return false;
	});

	if (count < maximum) {
		ast.forEach((node) => (node.props.className += ' jumboable'));
	}

	return ast;
}
