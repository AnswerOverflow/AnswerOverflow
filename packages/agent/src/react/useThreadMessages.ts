"use client";
import {
	omit,
	type BetterOmit,
	type ErrorMessage,
	type Expand,
} from "convex-helpers";
import { usePaginatedQuery } from "convex-helpers/react";
import {
	type PaginatedQueryArgs,
	type UsePaginatedQueryResult,
} from "convex/react";
import type {
	FunctionArgs,
	FunctionReference,
	PaginationOptions,
	PaginationResult,
} from "convex/server";
import { useMemo } from "react";
import type { SyncStreamsReturnValue } from "../client/types";
import { sorted } from "../shared";
import { fromUIMessages } from "../UIMessages";
import type {
	Message,
	MessageDoc,
	MessageStatus,
	StreamArgs,
} from "../validators";
import type { StreamQueryArgs, StreamQuery } from "./types";
import { useStreamingUIMessages } from "./useStreamingUIMessages";

export type MessageDocLike = {
	order: number;
	stepOrder: number;
	status: MessageStatus | "streaming";
	message?: Message;
};

export type ThreadMessagesQuery<
	Args = unknown,
	M extends MessageDocLike = MessageDocLike,
> = FunctionReference<
	"query",
	"public",
	{
		threadId: string;
		paginationOpts: PaginationOptions;
		/**
		 * If { stream: true } is passed, it will also query for stream deltas.
		 * In order for this to work, the query must take as an argument streamArgs.
		 */
		streamArgs?: StreamArgs;
	} & Args,
	PaginationResult<M> & { streams?: SyncStreamsReturnValue }
>;

export type ThreadMessagesArgs<
	Query extends ThreadMessagesQuery<unknown, MessageDocLike>,
> = Query extends ThreadMessagesQuery<unknown, MessageDocLike>
	? Expand<BetterOmit<FunctionArgs<Query>, "paginationOpts" | "streamArgs">>
	: never;

export type ThreadMessagesResult<
	Query extends ThreadMessagesQuery<unknown, MessageDocLike>,
> = Query extends ThreadMessagesQuery<unknown, infer M> ? M : never;

/**
 * A hook that fetches messages from a thread.
 *
 * This hook is a wrapper around `usePaginatedQuery` and `useStreamingThreadMessages`.
 * It will fetch both full messages and streaming messages, and merge them together.
 *
 * The query must take as arguments `{ threadId, paginationOpts }` and return a
 * pagination result of objects that extend `MessageDoc`.
 *
 * For streaming, it should look like this:
 * ```ts
 * export const listThreadMessages = query({
 *   args: {
 *     threadId: v.string(),
 *     paginationOpts: paginationOptsValidator,
 *     streamArgs: vStreamArgs,
 *     ... other arguments you want
 *   },
 *   handler: async (ctx, args) => {
 *     // await authorizeThreadAccess(ctx, threadId);
 *     // NOTE: listMessages returns MessageDocs, not UIMessages.
 *     const paginated = await listMessages(ctx, components.agent, args);
 *     const streams = await syncStreams(ctx, components.agent, args);
 *     // Here you could filter out / modify the documents & stream deltas.
 *     return { ...paginated, streams };
 *   },
 * });
 * ```
 *
 * Then the hook can be used like this:
 * ```ts
 * const { results, status, loadMore } = useThreadMessages(
 *   api.myModule.listThreadMessages,
 *   { threadId },
 *   { initialNumItems: 10, stream: true }
 * );
 * ```
 *
 * @param query The query to use to fetch messages.
 * It must take as arguments `{ threadId, paginationOpts }` and return a
 * pagination result of objects that extend `MessageDoc`.
 * To support streaming, it must also take in `streamArgs: vStreamArgs` and
 * return a `streams` object returned from `agent.syncStreams`.
 * @param args The arguments to pass to the query other than `paginationOpts`
 * and `streamArgs`. So `{ threadId }` at minimum, plus any other arguments that
 * you want to pass to the query.
 * @param options The options for the query. Similar to usePaginatedQuery.
 * To enable streaming, pass `stream: true`.
 * @returns The messages. If stream is true, it will return a list of messages
 *   that includes both full messages and streaming messages.
 */
export function useThreadMessages<Query extends ThreadMessagesQuery<any, any>>(
	query: Query,
	args: ThreadMessagesArgs<Query> | "skip",
	options: {
		initialNumItems: number;
		stream?: Query extends StreamQuery
			? boolean
			: ErrorMessage<"To enable streaming, your query must take in streamArgs: vStreamArgs and return a streams object returned from syncStreams. See docs.">;
	},
): UsePaginatedQueryResult<
	ThreadMessagesResult<Query> & { streaming: boolean; key: string }
> {
	// These are full messages
	const paginated = usePaginatedQuery(
		query,
		args as PaginatedQueryArgs<Query> | "skip",
		{ initialNumItems: options.initialNumItems },
	);

	let startOrder = paginated.results.at(-1)?.order ?? 0;
	for (let i = paginated.results.length - 1; i >= 0; i--) {
		const m = paginated.results[i];
		if (m && !m.streaming && m.status === "pending") {
			startOrder = m.order - (m.order % 10);
			break;
		}
	}
	// These are streaming messages that will not include full messages.
	const streamMessages = useStreamingThreadMessages(
		query as StreamQuery<ThreadMessagesArgs<Query>>,
		!options.stream ||
			args === "skip" ||
			paginated.status === "LoadingFirstPage"
			? "skip"
			: ({ ...args, paginationOpts: { cursor: null, numItems: 0 } } as any),
		{ startOrder },
	);

	const threadId = args === "skip" ? undefined : args.threadId;

	const merged = useMemo(() => {
		const streamListMessages =
			streamMessages?.map((m) => ({
				...m,
				streaming: !m.status || m.status === "pending",
			})) ?? [];
		return {
			...paginated,
			results: sorted(
				paginated.results
					.map((m) => ({ ...m, streaming: false }))
					// Note: this is intentionally after paginated results.
					.concat(streamListMessages) as (MessageDocLike & {
					streaming: boolean;
					key: string;
				})[],
			).reduce(
				(msgs, msg: MessageDocLike & { streaming: boolean; key: string }) => {
					msg.key = `${threadId}-${msg.order}-${msg.stepOrder}`;
					const last = msgs.at(-1);
					if (!last) {
						return [msg];
					}
					if (last.order !== msg.order || last.stepOrder !== msg.stepOrder) {
						return [...msgs, msg];
					}
					if (
						last.status === "pending" &&
						(msg.streaming || msg.status !== "pending")
					) {
						// Let's prefer a streaming or finalized message over a pending
						// one.
						return [...msgs.slice(0, -1), msg];
					}
					// skip the new one if the previous one (listed) was finalized
					return msgs;
				},
				[] as (MessageDocLike & { streaming: boolean; key: string })[],
			),
		};
	}, [paginated, streamMessages, threadId]);

	return merged as ThreadMessagesResult<Query> & {
		key: string;
		streaming: boolean;
	};
}

/**
 * @deprecated FYI `useStreamingUIMessages` is likely better for you.
 * A hook that fetches streaming messages from a thread.
 * This ONLY returns streaming messages. To get both, use `useThreadMessages`.
 *
 * @param query The query to use to fetch messages.
 * It must take as arguments `{ threadId, paginationOpts, streamArgs }` and
 * return a `streams` object returned from `agent.syncStreams`.
 * @param args The arguments to pass to the query other than `paginationOpts`
 * and `streamArgs`. So `{ threadId }` at minimum, plus any other arguments that
 * you want to pass to the query.
 * @returns The streaming messages.
 */
export function useStreamingThreadMessages<Query extends StreamQuery<any>>(
	query: Query,
	args:
		| (StreamQueryArgs<Query> & {
				/** @deprecated Pass startOrder to the next argument (third argument). */
				startOrder?: number;
		  })
		| "skip",
	options?: {
		startOrder?: number;
		skipStreamIds?: string[];
	},
): Array<MessageDoc> | undefined {
	const queryArgs =
		args === "skip"
			? args
			: (omit(args, ["startOrder"]) as unknown as StreamQueryArgs<Query>);
	const startOrder =
		args === "skip" ? undefined : (args.startOrder ?? undefined);
	const queryOptions = { startOrder, ...options };
	const uiMessages = useStreamingUIMessages(query, queryArgs, queryOptions);
	if (args === "skip") {
		return undefined;
	}
	// TODO: we aren't passing through as much metadata as we could here.
	// We could share the stream metadata logic with useStreamingUIMessages.
	return uiMessages
		?.map((m) => fromUIMessages([m], { threadId: args.threadId }))
		.flat();
}
