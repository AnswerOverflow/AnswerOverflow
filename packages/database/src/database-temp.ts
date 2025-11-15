/** biome-ignore-all lint/suspicious/noExplicitAny: any is fine here */

import type {
	FunctionArgs,
	FunctionReference,
	FunctionReturnType,
} from "convex/server";
import { Config, Effect } from "effect";
import { api } from "../convex/_generated/api";
import { ConvexClientLiveUnifiedLayer } from "./convex-client-live";
import { ConvexClientUnified, ConvexError } from "./convex-unified-client";
import { FUNCTION_TYPE_MAP, isNamespace } from "./generated/function-types";

// Transform FunctionReference to function signature, omitting backendAccessToken
// Returns an Effect instead of a Promise
type FunctionRefToFunction<Ref extends FunctionReference<any, any>> = (
	args: Omit<FunctionArgs<Ref>, "backendAccessToken">,
) => Effect.Effect<FunctionReturnType<Ref>, ConvexError>;

// Helper type for recursively transforming nested objects
type TransformToFunctions<T> = {
	[K in keyof T]: T[K] extends FunctionReference<any, any>
		? FunctionRefToFunction<T[K]>
		: T[K] extends Record<string, any>
			? TransformToFunctions<T[K]>
			: T[K];
};

// Helper function to build function path from namespace path and function name
function buildFunctionPath(
	namespacePath: string[],
	functionName: string,
): string {
	if (namespacePath.length === 0) {
		return functionName;
	}
	return `${namespacePath.join(".")}.${functionName}`;
}

// Helper function to call the appropriate client method based on function type
function callClientMethod(
	funcType: "query" | "mutation" | "action",
	funcRef: FunctionReference<any, any>,
	client: { query: any; mutation: any; action: any },
	fullArgs: any,
): Effect.Effect<any, ConvexError> {
	return Effect.tryPromise({
		try: async () => {
			switch (funcType) {
				case "query":
					return await client.query(funcRef, fullArgs);
				case "mutation":
					return await client.mutation(funcRef, fullArgs);
				case "action":
					return await client.action(funcRef, fullArgs);
			}
		},
		catch: (cause) => new ConvexError({ cause }),
	});
}

const serviceGen = Effect.gen(function* () {
	const backendAccessToken = yield* Config.string("BACKEND_ACCESS_TOKEN");
	const convexClient = yield* ConvexClientUnified;

	// Use codegen-generated structure to simplify namespace/function detection
	// Type the Proxy to preserve PublicInternalFunctions structure
	const createProxy = <T extends Record<string, any>>(
		target: T,
		namespacePath: string[],
	): TransformToFunctions<T> => {
		return new Proxy(target, {
			get(innerTarget, prop: string | symbol) {
				// Handle symbols and special properties
				if (
					typeof prop !== "string" ||
					prop.startsWith("_") ||
					prop === "constructor"
				) {
					return Reflect.get(innerTarget, prop);
				}

				const value = Reflect.get(innerTarget, prop);
				if (value === undefined) {
					return undefined;
				}

				// Use generated structure to check if this is a namespace
				if (isNamespace(prop)) {
					// It's a namespace - create a proxy for it
					return createProxy(value, [
						...namespacePath,
						prop,
					]) as TransformToFunctions<T>[typeof prop];
				}

				// It's a function - look up its type and wrap it
				const functionPath = buildFunctionPath(namespacePath, prop);
				const funcType =
					FUNCTION_TYPE_MAP[functionPath as keyof typeof FUNCTION_TYPE_MAP];

				if (!funcType) {
					throw new Error(
						`Function ${functionPath} not found in FUNCTION_TYPE_MAP. Run codegen to update.`,
					);
				}

				const funcRef = value as FunctionReference<any, any>;
				const wrappedFunction = ((args: any) => {
					const fullArgs = { ...args, backendAccessToken };
					return callClientMethod(
						funcType,
						funcRef,
						convexClient.client,
						fullArgs,
					);
				}) as TransformToFunctions<T>[typeof prop];

				return wrappedFunction;
			},
		}) as TransformToFunctions<T>;
	};

	return createProxy(api.publicInternal, []);
});

const program = Effect.gen(function* () {
	const service = yield* serviceGen;
	const biggestServers = yield* service.servers.getBiggestServers({ take: 20 });
	console.log(biggestServers);
}).pipe(Effect.provide(ConvexClientLiveUnifiedLayer));

await Effect.runPromise(program);
