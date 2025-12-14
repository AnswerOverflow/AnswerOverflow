import { ESLintUtils } from "@typescript-eslint/utils";

export default {
	rules: {
		"no-effect-unknown-error": {
			meta: {
				type: "problem",
				docs: {
					description:
						"Disallow Effect types with 'unknown' as the error parameter. Use 'never' instead to preserve type inference.",
				},
				messages: {
					unknownError:
						"Effect type should not use 'unknown' as the error parameter. Use 'never' instead or provide a catch handler to specify the error type. Using 'unknown' ruins TypeScript's ability to do inference with Effect.",
					inferredUnknownError:
						"Function returns Effect with inferred 'unknown' error type. Provide a catch handler or explicitly type the error to enable proper type inference. Current type: {{typeString}}",
				},
				schema: [],
			},
			create(context) {
				const parserServices = ESLintUtils.getParserServices(context, true);
				if (!parserServices) {
					return {};
				}

				const checker = parserServices.program.getTypeChecker();

				function isEffectType(node) {
					// Check for Effect.Effect
					if (
						node.typeName &&
						node.typeName.type === "TSQualifiedName" &&
						node.typeName.left &&
						node.typeName.left.type === "Identifier" &&
						node.typeName.left.name === "Effect" &&
						node.typeName.right &&
						node.typeName.right.type === "Identifier" &&
						node.typeName.right.name === "Effect"
					) {
						return true;
					}

					// Check for just Effect (imported as type)
					if (
						node.typeName &&
						node.typeName.type === "Identifier" &&
						node.typeName.name === "Effect"
					) {
						return true;
					}

					return false;
				}

				function checkTypeForUnknownError(type, node) {
					const typeString = checker.typeToString(type);

					// Check if this is an Effect type with unknown in error position
					// Pattern: Effect<Success, unknown, Context> or Effect.Effect<Success, unknown, Context>
					const effectWithUnknownPattern =
						/Effect(?:\.Effect)?<[^,]+,\s*unknown(?:,|>)/;

					if (effectWithUnknownPattern.test(typeString)) {
						context.report({
							node,
							messageId: "inferredUnknownError",
							data: {
								typeString,
							},
						});
					}
				}

				return {
					TSUnknownKeyword(node) {
						// Navigate up to find the TSTypeReference parent
						let current = node.parent;
						while (current && current.type !== "TSTypeReference") {
							current = current.parent;
						}

						if (!current || !isEffectType(current)) {
							return;
						}

						// Find which parameter position this unknown is in
						const typeParams = current.typeParameters || current.typeArguments;
						if (!typeParams || !typeParams.params) {
							return;
						}

						const unknownIndex = typeParams.params.indexOf(node);

						// We only care if 'unknown' is in the error position (index 1)
						if (unknownIndex !== 1) {
							return;
						}

						const sourceCode = context.sourceCode || context.getSourceCode();
						const successParam = sourceCode.getText(typeParams.params[0]);
						const contextParam = typeParams.params[2]
							? sourceCode.getText(typeParams.params[2])
							: "never";

						context.report({
							node,
							messageId: "unknownError",
							data: {
								success: successParam,
								context: contextParam,
							},
						});
					},
					// Check function declarations and expressions for inferred unknown error types
					"FunctionDeclaration, FunctionExpression, ArrowFunctionExpression"(
						node,
					) {
						try {
							// Skip if function has explicit return type annotation
							if (node.returnType) {
								return;
							}

							const tsNode = parserServices.esTreeNodeToTSNodeMap.get(node);
							const signature = checker.getSignatureFromDeclaration(tsNode);

							if (signature) {
								const returnType = checker.getReturnTypeOfSignature(signature);
								checkTypeForUnknownError(returnType, node);
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
