import { ESLintUtils } from "@typescript-eslint/utils";

export default {
	rules: {
		"no-string-comparison": {
			meta: {
				type: "problem",
				docs: {
					description:
						"Disallow comparison operators (<, >, <=, >=) on strings. Use BigInt for Discord snowflake IDs.",
				},
				messages: {
					stringComparison:
						"Do not use '{{operator}}' operator on strings. Convert to BigInt for Discord snowflake IDs: BigInt(id1) {{operator}} BigInt(id2). If this is a legitimate numeric comparison, add // eslint-disable-next-line no-restricted-syntax",
				},
				schema: [],
			},
			create(context) {
				const parserServices = ESLintUtils.getParserServices(context, true);
				if (!parserServices) {
					return {};
				}

				const checker = parserServices.program.getTypeChecker();

				const operators = ["<", ">", "<=", ">="];

				function isStringType(type) {
					if (type.flags === 1) {
						return true;
					}
					const typeString = checker.typeToString(type);
					if (typeString === "string") {
						return true;
					}
					const symbol = type.getSymbol();
					if (symbol && symbol.getName() === "String") {
						return true;
					}
					return false;
				}

				return {
					BinaryExpression(node) {
						if (!operators.includes(node.operator)) {
							return;
						}

						try {
							const leftType = parserServices.getTypeAtLocation(node.left);
							const rightType = parserServices.getTypeAtLocation(node.right);

							if (isStringType(leftType) && isStringType(rightType)) {
								const sourceCode =
									context.sourceCode || context.getSourceCode();
								const leftText = sourceCode.getText(node.left);
								const rightText = sourceCode.getText(node.right);

								context.report({
									node,
									messageId: "stringComparison",
									data: {
										operator: node.operator,
									},
									fix(fixer) {
										return fixer.replaceText(
											node,
											`BigInt(${leftText}) ${node.operator} BigInt(${rightText})`,
										);
									},
								});
							}
						} catch {
							// If type information is not available, skip this check
						}
					},
				};
			},
		},
	},
};
