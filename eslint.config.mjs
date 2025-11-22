import tseslint from "typescript-eslint";

export default tseslint.config(
	{
		files: ["**/*.{ts,tsx}"],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				ecmaVersion: "latest",
				sourceType: "module",
			},
		},
		rules: {
			"no-restricted-syntax": [
				"error",
				{
					selector:
						"BinaryExpression[operator='>=']:has(> Identifier, > MemberExpression):not(:has(> Literal))",
					message:
						"Do not use '>=' operator on strings. Convert to BigInt for Discord snowflake IDs: BigInt(id1) >= BigInt(id2). If this is a legitimate numeric comparison, add // eslint-disable-next-line no-restricted-syntax",
				},
				{
					selector:
						"BinaryExpression[operator='<=']:has(> Identifier, > MemberExpression):not(:has(> Literal))",
					message:
						"Do not use '<=' operator on strings. Convert to BigInt for Discord snowflake IDs: BigInt(id1) <= BigInt(id2). If this is a legitimate numeric comparison, add // eslint-disable-next-line no-restricted-syntax",
				},
				{
					selector:
						"BinaryExpression[operator='>']:has(> Identifier, > MemberExpression):not(:has(> Literal))",
					message:
						"Do not use '>' operator on strings. Convert to BigInt for Discord snowflake IDs: BigInt(id1) > BigInt(id2). If this is a legitimate numeric comparison, add // eslint-disable-next-line no-restricted-syntax",
				},
				{
					selector:
						"BinaryExpression[operator='<']:has(> Identifier, > MemberExpression):not(:has(> Literal))",
					message:
						"Do not use '<' operator on strings. Convert to BigInt for Discord snowflake IDs: BigInt(id1) < BigInt(id2). If this is a legitimate numeric comparison, add // eslint-disable-next-line no-restricted-syntax",
				},
			],
		},
	},
	{
		ignores: [
			"**/node_modules/**",
			"**/dist/**",
			"**/.turbo/**",
			"**/convex/_generated/**",
			"**/.context/**",
			"**/packages/convex-test/**",
			"**/packages/discord-api/src/generated.ts",
			"**/packages/database/src/generated/function-types.ts",
		],
	},
);
