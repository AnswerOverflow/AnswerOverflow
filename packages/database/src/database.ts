/** biome-ignore-all lint/suspicious/noExplicitAny: any is fine here */

import type {
	FunctionArgs,
	FunctionReference,
	FunctionReturnType,
} from "convex/server";

import { Config, Context, Effect, Layer } from "effect";
import { api, internal } from "../convex/_generated/api";
import type { Emoji, Message } from "../convex/schema";
import type { DatabaseAttachment } from "../convex/shared/shared";
import { ConvexClientLiveUnifiedLayer } from "./convex-client-live";
import { ConvexClientUnified, ConvexError } from "./convex-unified-client";
import { FUNCTION_TYPE_MAP, isNamespace } from "./generated/function-types";
import type { LiveData } from "./live-data";
import { createWatchQueryToLiveData } from "./watch-query-cached";

type IsEmptyArgs<Args> = Omit<Args, "backendAccessToken"> extends Record<
	string,
	never
>
	? true
	: false;

type QueryOptions = {
	subscribe?: boolean;
};

type QueryReturnType<
	Ref extends FunctionReference<"query", any>,
	Opts extends QueryOptions | undefined,
> = Opts extends { subscribe: true }
	? LiveData<FunctionReturnType<Ref>>
	: FunctionReturnType<Ref>;

type FunctionRefToFunction<Ref extends FunctionReference<any, any>> =
	Ref extends FunctionReference<"query", any>
		? IsEmptyArgs<FunctionArgs<Ref>> extends true
			? <Opts extends QueryOptions | undefined = undefined>(
					args?: Omit<FunctionArgs<Ref>, "backendAccessToken">,
					options?: Opts,
				) => Effect.Effect<QueryReturnType<Ref, Opts>, ConvexError>
			: <Opts extends QueryOptions | undefined = undefined>(
					args: Omit<FunctionArgs<Ref>, "backendAccessToken">,
					options?: Opts,
				) => Effect.Effect<QueryReturnType<Ref, Opts>, ConvexError>
		: IsEmptyArgs<FunctionArgs<Ref>> extends true
			? (
					args?: Omit<FunctionArgs<Ref>, "backendAccessToken">,
				) => Effect.Effect<FunctionReturnType<Ref>, ConvexError>
			: (
					args: Omit<FunctionArgs<Ref>, "backendAccessToken">,
				) => Effect.Effect<FunctionReturnType<Ref>, ConvexError>;

type TransformToFunctions<T> = {
	[K in keyof T]: T[K] extends FunctionReference<any, any>
		? FunctionRefToFunction<T[K]>
		: T[K] extends Record<string, any>
			? TransformToFunctions<T[K]>
			: T[K];
};

function buildFunctionPath(
	namespacePath: string[],
	functionName: string,
): string {
	if (namespacePath.length === 0) {
		return functionName;
	}
	return `${namespacePath.join(".")}.${functionName}`;
}

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

export const service = Effect.gen(function* () {
	const backendAccessToken = yield* Config.string("BACKEND_ACCESS_TOKEN");
	const convexClient = yield* ConvexClientUnified;

	const watchQueryToLiveData = createWatchQueryToLiveData(convexClient, {
		api,
		internal,
	});

	const createProxy = <T extends Record<string, any>>(
		target: T,
		namespacePath: string[],
		isPublic: boolean,
	): TransformToFunctions<T> => {
		return new Proxy(target, {
			get(innerTarget, prop: string | symbol) {
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

				if (isNamespace(prop)) {
					return createProxy(
						value,
						[...namespacePath, prop],
						isPublic,
					) as TransformToFunctions<T>[typeof prop];
				}

				const functionPath = buildFunctionPath(namespacePath, prop);
				const funcType =
					FUNCTION_TYPE_MAP[functionPath as keyof typeof FUNCTION_TYPE_MAP];

				if (!funcType) {
					throw new Error(
						`Function ${functionPath} not found in FUNCTION_TYPE_MAP. Run codegen to update.`,
					);
				}

				const funcRef = value as FunctionReference<any, any>;

				if (funcType === "query") {
					const wrappedFunction = ((args?: any, options: QueryOptions = {}) => {
						const fullArgs = isPublic
							? (args ?? {})
							: { ...(args ?? {}), backendAccessToken };

						if (options.subscribe === true) {
							return Effect.gen(function* () {
								const getQuery = () => funcRef;
								const liveData = yield* watchQueryToLiveData(
									getQuery,
									fullArgs,
								);
								return liveData;
							});
						}

						return callClientMethod(
							funcType,
							funcRef,
							convexClient.client,
							fullArgs,
						);
					}) as TransformToFunctions<T>[typeof prop];

					return wrappedFunction;
				}

				const wrappedFunction = ((args?: any) => {
					const fullArgs = isPublic
						? (args ?? {})
						: { ...(args ?? {}), backendAccessToken };
					return callClientMethod(
						funcType,
						funcRef,
						convexClient.client,
						fullArgs,
					);
				}) as TransformToFunctions<T>[typeof prop];

				return wrappedFunction;
			},
			ownKeys(innerTarget) {
				return Reflect.ownKeys(innerTarget);
			},
			getOwnPropertyDescriptor(innerTarget, prop) {
				return Reflect.getOwnPropertyDescriptor(innerTarget, prop);
			},
		}) as TransformToFunctions<T>;
	};

	const privateProxy = createProxy(api.private, [], false);
	const publicProxy = createProxy(api.public, [], false);
	const authenticatedProxy = createProxy(api.authenticated, [], false);

	const result = {
		public: publicProxy,
		authenticated: authenticatedProxy,
		private: privateProxy,
	};

	return result;
});
export class Database extends Context.Tag("Database")<
	Database,
	Effect.Effect.Success<typeof service>
>() {}

export const DatabaseLayer = Layer.effect(Database, service).pipe(
	Layer.provide(ConvexClientLiveUnifiedLayer),
);

export type BaseMessageWithRelations = Message & {
	attachments?: DatabaseAttachment[];
	reactions?: Array<{
		userId: bigint;
		emoji: Emoji;
	}>;
};
