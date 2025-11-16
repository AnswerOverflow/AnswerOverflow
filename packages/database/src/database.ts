/** biome-ignore-all lint/suspicious/noExplicitAny: any is fine here */

import type {
	FunctionArgs,
	FunctionReference,
	FunctionReturnType,
} from "convex/server";
import { Config, Context, Effect, Layer } from "effect";
import { api, internal } from "../convex/_generated/api";
import type { Attachment, Emoji, Message } from "../convex/schema";
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
					return createProxy(value, [
						...namespacePath,
						prop,
					]) as TransformToFunctions<T>[typeof prop];
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
						const fullArgs = { ...(args ?? {}), backendAccessToken };

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
					const fullArgs = { ...(args ?? {}), backendAccessToken };
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
export class Database extends Context.Tag("Database")<
	Database,
	Effect.Effect.Success<typeof service>
>() {}

export const DatabaseLayer = Layer.effect(Database, service).pipe(
	Layer.provide(ConvexClientLiveUnifiedLayer),
);

export async function upsertMessage(
	data: BaseMessageWithRelations,
	opts?: {
		ignoreChecks?: boolean;
	},
): Promise<void> {
	const program = Effect.gen(function* () {
		const db = yield* Database;
		yield* db.messages.upsertMessage({
			message: {
				id: data.id,
				authorId: data.authorId,
				serverId: data.serverId,
				channelId: data.channelId,
				parentChannelId: data.parentChannelId,
				childThreadId: data.childThreadId,
				questionId: data.questionId,
				referenceId: data.referenceId,
				applicationId: data.applicationId,
				interactionId: data.interactionId,
				webhookId: data.webhookId,
				content: data.content,
				flags: data.flags,
				type: data.type,
				pinned: data.pinned,
				nonce: data.nonce,
				tts: data.tts,
				embeds: data.embeds,
			},
			attachments: data.attachments,
			reactions: data.reactions,
			ignoreChecks: opts?.ignoreChecks,
		});
	}).pipe(Effect.provide(DatabaseLayer));

	await Effect.runPromise(program);
}

export type BaseMessageWithRelations = Message & {
	attachments?: Attachment[];
	reactions?: Array<{
		userId: string;
		emoji: Emoji;
	}>;
};
export async function upsertManyMessages(
	data: BaseMessageWithRelations[],
	opts?: {
		ignoreChecks?: boolean;
	},
): Promise<BaseMessageWithRelations[]> {
	if (data.length === 0) return Promise.resolve([]);

	const program = Effect.gen(function* () {
		const db = yield* Database;
		yield* db.messages.upsertManyMessages({
			messages: data.map((msg) => ({
				message: {
					id: msg.id,
					authorId: msg.authorId,
					serverId: msg.serverId,
					channelId: msg.channelId,
					parentChannelId: msg.parentChannelId,
					childThreadId: msg.childThreadId,
					questionId: msg.questionId,
					referenceId: msg.referenceId,
					applicationId: msg.applicationId,
					interactionId: msg.interactionId,
					webhookId: msg.webhookId,
					content: msg.content,
					flags: msg.flags,
					type: msg.type,
					pinned: msg.pinned,
					nonce: msg.nonce,
					tts: msg.tts,
					embeds: msg.embeds,
				},
				attachments: msg.attachments,
				reactions: msg.reactions,
			})),
			ignoreChecks: opts?.ignoreChecks,
		});
		return data; // Return the input data as the old API does
	}).pipe(Effect.provide(DatabaseLayer));

	return await Effect.runPromise(program);
}
