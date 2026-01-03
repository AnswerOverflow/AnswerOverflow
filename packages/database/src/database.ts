/** biome-ignore-all lint/suspicious/noExplicitAny: any is fine here */

import type {
	FunctionArgs,
	FunctionReference,
	FunctionReturnType,
} from "convex/server";
import { getFunctionName } from "convex/server";
import type { Value } from "convex/values";
import { convexToJson } from "convex/values";

import {
	Cache,
	Context,
	Duration,
	Effect,
	HashMap,
	Layer,
	Option,
	Ref,
} from "effect";
import { api, internal } from "../convex/_generated/api";
import type { Emoji, Message, Sticker } from "../convex/schema";
import type { DatabaseAttachment } from "../convex/shared/shared";
import { ConvexClientHttpUnifiedLayer } from "./convex-client-http";
import { ConvexClientLiveUnifiedLayer } from "./convex-client-live";
import { ConvexClientUnified, ConvexError } from "./convex-unified-client";

export { ConvexError } from "./convex-unified-client";

import {
	FUNCTION_TYPE_MAP,
	isAuthenticatedNamespace,
	isNamespace,
} from "./generated/function-types";
import type { LiveData } from "./live-data";
import { createWatchQueryToLiveData } from "./watch-query-cached";

type InternalArgs =
	| "backendAccessToken"
	| "publicBackendAccessToken"
	| "discordAccountId"
	| "anonymousSessionId"
	| "type"
	| "rateLimitKey";

type IsEmptyArgs<Args> = Omit<Args, InternalArgs> extends Record<string, never>
	? true
	: false;

type QueryOptions = {
	subscribe?: boolean;
};

export type DiscordBotAuth = {
	discordAccountId: bigint;
	token?: never;
};

export type TokenAuth = {
	token: string;
	discordAccountId?: never;
};

export type AuthenticatedQueryOptions = QueryOptions &
	(DiscordBotAuth | TokenAuth);

export type AuthenticatedMutationOptions = DiscordBotAuth | TokenAuth;

type QueryReturnType<
	Ref extends FunctionReference<"query", any>,
	Opts extends QueryOptions | undefined,
> = Opts extends { subscribe: true }
	? LiveData<FunctionReturnType<Ref>>
	: FunctionReturnType<Ref>;

type OmitInternalArgs<Args> = Omit<Args, InternalArgs>;

type FunctionRefToFunction<Ref extends FunctionReference<any, any>> =
	Ref extends FunctionReference<"query", any>
		? IsEmptyArgs<FunctionArgs<Ref>> extends true
			? <Opts extends QueryOptions | undefined = undefined>(
					args?: OmitInternalArgs<FunctionArgs<Ref>>,
					options?: Opts,
				) => Effect.Effect<QueryReturnType<Ref, Opts>, ConvexError>
			: <Opts extends QueryOptions | undefined = undefined>(
					args: OmitInternalArgs<FunctionArgs<Ref>>,
					options?: Opts,
				) => Effect.Effect<QueryReturnType<Ref, Opts>, ConvexError>
		: IsEmptyArgs<FunctionArgs<Ref>> extends true
			? (
					args?: OmitInternalArgs<FunctionArgs<Ref>>,
				) => Effect.Effect<FunctionReturnType<Ref>, ConvexError>
			: (
					args: OmitInternalArgs<FunctionArgs<Ref>>,
				) => Effect.Effect<FunctionReturnType<Ref>, ConvexError>;

type AuthenticatedFunctionRefToFunction<
	Ref extends FunctionReference<any, any>,
> = Ref extends FunctionReference<"query", any>
	? IsEmptyArgs<FunctionArgs<Ref>> extends true
		? <Opts extends AuthenticatedQueryOptions>(
				args: OmitInternalArgs<FunctionArgs<Ref>> | Record<string, never>,
				options: Opts,
			) => Effect.Effect<QueryReturnType<Ref, Opts>, ConvexError>
		: <Opts extends AuthenticatedQueryOptions>(
				args: OmitInternalArgs<FunctionArgs<Ref>>,
				options: Opts,
			) => Effect.Effect<QueryReturnType<Ref, Opts>, ConvexError>
	: IsEmptyArgs<FunctionArgs<Ref>> extends true
		? (
				args: OmitInternalArgs<FunctionArgs<Ref>> | Record<string, never>,
				options: AuthenticatedMutationOptions,
			) => Effect.Effect<FunctionReturnType<Ref>, ConvexError>
		: (
				args: OmitInternalArgs<FunctionArgs<Ref>>,
				options: AuthenticatedMutationOptions,
			) => Effect.Effect<FunctionReturnType<Ref>, ConvexError>;

type TransformToFunctions<T> = {
	[K in keyof T]: T[K] extends FunctionReference<any, any>
		? FunctionRefToFunction<T[K]>
		: T[K] extends Record<string, any>
			? TransformToFunctions<T[K]>
			: T[K];
};

type TransformToAuthenticatedFunctions<T> = {
	[K in keyof T]: T[K] extends FunctionReference<any, any>
		? AuthenticatedFunctionRefToFunction<T[K]>
		: T[K] extends Record<string, any>
			? TransformToAuthenticatedFunctions<T[K]>
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

export function createQueryCacheKey(
	functionPath: string,
	args: Record<string, unknown>,
): string {
	return JSON.stringify({
		args: convexToJson(args as unknown as Value),
		functionPath,
	});
}

function callClientMethod(
	funcType: "query" | "mutation" | "action",
	funcRef: FunctionReference<any, any>,
	client: { query: any; mutation: any; action: any },
	fullArgs: any,
): Effect.Effect<any, ConvexError> {
	const functionName = getFunctionName(funcRef);
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
	}).pipe(
		Effect.withSpan(`convex.${funcType}`, {
			attributes: {
				"convex.function": functionName,
				"convex.type": funcType,
			},
		}),
	);
}

const isDevelopment = process.env.NODE_ENV === "development";

export const service = Effect.gen(function* () {
	const backendAccessToken = process.env.BACKEND_ACCESS_TOKEN!;
	const publicBackendAccessToken = process.env.PUBLIC_BACKEND_ACCESS_TOKEN!;
	const convexClient = yield* ConvexClientUnified;

	const watchQueryToLiveData = createWatchQueryToLiveData(convexClient, {
		api,
		internal,
	});

	type QueryMetricsState = {
		hits: HashMap.HashMap<string, number>;
		misses: HashMap.HashMap<string, number>;
	};

	const metricsRef = yield* Ref.make<QueryMetricsState>({
		hits: HashMap.empty(),
		misses: HashMap.empty(),
	});

	const incrementCacheHit = (cacheKey: string) =>
		Ref.update(metricsRef, (state) => ({
			...state,
			hits: HashMap.set(
				state.hits,
				cacheKey,
				Option.getOrElse(HashMap.get(state.hits, cacheKey), () => 0) + 1,
			),
		}));

	const incrementCacheMiss = (cacheKey: string) =>
		Ref.update(metricsRef, (state) => ({
			...state,
			misses: HashMap.set(
				state.misses,
				cacheKey,
				Option.getOrElse(HashMap.get(state.misses, cacheKey), () => 0) + 1,
			),
		}));

	const lookupContexts = new Map<
		string,
		{ funcRef: FunctionReference<any, any>; args: Record<string, unknown> }
	>();

	const queryCache = yield* Cache.make({
		capacity: isDevelopment ? 0 : 500,
		timeToLive: isDevelopment ? Duration.zero : Duration.minutes(5),
		lookup: (cacheKey: string) =>
			Effect.gen(function* () {
				const context = lookupContexts.get(cacheKey);
				if (!context) {
					throw new Error(`Lookup context not found for key: ${cacheKey}`);
				}
				yield* incrementCacheMiss(cacheKey);
				return yield* callClientMethod(
					"query",
					context.funcRef,
					convexClient.client,
					context.args,
				);
			}),
	});

	const getCachedOrFetch = (
		cacheKey: string,
		funcRef: FunctionReference<any, any>,
		args: Record<string, unknown>,
	): Effect.Effect<unknown, ConvexError> => {
		lookupContexts.set(cacheKey, { funcRef, args });

		return Effect.gen(function* () {
			const isCached = yield* queryCache.contains(cacheKey);
			const result = yield* queryCache.get(cacheKey);
			if (isCached) {
				yield* incrementCacheHit(cacheKey);
			}
			return result;
		});
	};

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
					const wrappedFunction = ((
						args?: any,
						options: QueryOptions = {
							subscribe: true,
						},
					) => {
						const fullArgs: Record<string, unknown> = isPublic
							? { ...(args ?? {}), publicBackendAccessToken }
							: { ...(args ?? {}), backendAccessToken };
						const cacheKey = createQueryCacheKey(
							getFunctionName(funcRef),
							fullArgs,
						);

						if (options.subscribe === true) {
							return Effect.gen(function* () {
								const getQuery = () => funcRef;
								const liveData = yield* watchQueryToLiveData(
									getQuery,
									fullArgs,
								);
								return liveData?.data;
							});
						}

						return getCachedOrFetch(cacheKey, funcRef, fullArgs);
					}) as TransformToFunctions<T>[typeof prop];

					return wrappedFunction;
				}

				const wrappedFunction = ((args?: any) => {
					const fullArgs = isPublic
						? { ...(args ?? {}), publicBackendAccessToken }
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
	const publicProxy = createProxy(api.public, [], true);

	const createAuthenticatedProxy = <T extends Record<string, any>>(
		target: T,
		namespacePath: string[],
	): TransformToAuthenticatedFunctions<T> => {
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

				if (isAuthenticatedNamespace(prop)) {
					return createAuthenticatedProxy(value, [
						...namespacePath,
						prop,
					]) as TransformToAuthenticatedFunctions<T>[typeof prop];
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
					const wrappedFunction = ((
						args?: any,
						// @ts-expect-error
						options: AuthenticatedQueryOptions = { subscribe: true },
					) => {
						const { subscribe, discordAccountId, token } = options;

						let client: { query: any; mutation: any; action: any };
						let fullArgs: Record<string, unknown>;

						if (discordAccountId !== undefined) {
							client = convexClient.client;
							fullArgs = {
								...(args ?? {}),
								backendAccessToken,
								discordAccountId,
							};
						} else if (token !== undefined) {
							client = convexClient.createAuthenticatedClient(token);
							fullArgs = { ...(args ?? {}) };
						} else {
							throw new Error(
								"Must provide either discordAccountId or token for authenticated calls",
							);
						}

						const _cacheKey = createQueryCacheKey(
							getFunctionName(funcRef),
							fullArgs,
						);

						if (subscribe === true) {
							return Effect.gen(function* () {
								const getQuery = () => funcRef;
								const liveData = yield* watchQueryToLiveData(
									getQuery,
									fullArgs,
								);
								return liveData?.data;
							});
						}

						return callClientMethod("query", funcRef, client, fullArgs);
					}) as TransformToAuthenticatedFunctions<T>[typeof prop];

					return wrappedFunction;
				}

				const wrappedFunction = ((
					args?: any,
					// @ts-expect-error
					options: AuthenticatedMutationOptions = {},
				) => {
					const { discordAccountId, token } = options;

					let client: { query: any; mutation: any; action: any };
					let fullArgs: Record<string, unknown>;

					if (discordAccountId !== undefined) {
						client = convexClient.client;
						fullArgs = {
							...(args ?? {}),
							backendAccessToken,
							discordAccountId,
						};
					} else if (token !== undefined) {
						client = convexClient.createAuthenticatedClient(token);
						fullArgs = { ...(args ?? {}) };
					} else {
						throw new Error(
							"Must provide either discordAccountId or token for authenticated calls",
						);
					}

					return callClientMethod(funcType, funcRef, client, fullArgs);
				}) as TransformToAuthenticatedFunctions<T>[typeof prop];

				return wrappedFunction;
			},
			ownKeys(innerTarget) {
				return Reflect.ownKeys(innerTarget);
			},
			getOwnPropertyDescriptor(innerTarget, prop) {
				return Reflect.getOwnPropertyDescriptor(innerTarget, prop);
			},
		}) as TransformToAuthenticatedFunctions<T>;
	};

	const authenticatedProxy = createAuthenticatedProxy(api.authenticated, []);

	const getQueryMetricsByKey = (cacheKey: string) => {
		const state = Ref.get(metricsRef).pipe(Effect.runSync);
		return {
			hits: Option.getOrElse(HashMap.get(state.hits, cacheKey), () => 0),
			misses: Option.getOrElse(HashMap.get(state.misses, cacheKey), () => 0),
		};
	};

	const getQueryMetrics = <Query extends FunctionReference<"query", any>>(
		query: Query,
		args: Omit<FunctionArgs<Query>, "backendAccessToken">,
	) => {
		const functionName = getFunctionName(query);
		const fullArgs = { ...args, backendAccessToken };
		const cacheKey = createQueryCacheKey(functionName, fullArgs);
		return getQueryMetricsByKey(cacheKey);
	};

	const getAllQueryMetrics = () => {
		const state = Ref.get(metricsRef).pipe(Effect.runSync);
		return {
			hits: new Map(HashMap.toEntries(state.hits)),
			misses: new Map(HashMap.toEntries(state.misses)),
		};
	};

	const resetQueryMetrics = () => {
		Ref.set(metricsRef, {
			hits: HashMap.empty(),
			misses: HashMap.empty(),
		}).pipe(Effect.runSync);
	};

	return {
		public: publicProxy,
		authenticated: authenticatedProxy,
		private: privateProxy,
		metrics: {
			getQueryMetrics,
			getAllQueryMetrics,
			resetQueryMetrics,
		},
	};
});
export class Database extends Context.Tag("Database")<
	Database,
	Effect.Effect.Success<typeof service>
>() {}

export const DatabaseLayer = Layer.effect(Database, service).pipe(
	Layer.provide(ConvexClientLiveUnifiedLayer),
);

export const DatabaseHttpLayer = Layer.effect(Database, service).pipe(
	Layer.provide(ConvexClientHttpUnifiedLayer),
);

export type BaseMessageWithRelations = Message & {
	attachments?: DatabaseAttachment[];
	reactions?: Array<{
		userId: bigint;
		emoji: Emoji;
	}>;
	stickers?: Sticker[];
};
