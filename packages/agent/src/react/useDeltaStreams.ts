"use client";

import type { StreamQuery, StreamQueryArgs } from "./types";
import type { SyncStreamsReturnValue } from "../client/types";
import type { FunctionArgs } from "convex/server";
import type { StreamArgs, StreamDelta, StreamMessage } from "../validators";
import { sorted } from "../shared";
import { useQuery } from "convex/react";
import { useState } from "react";
import { assert } from "convex-helpers";

export function useDeltaStreams<
	Query extends StreamQuery<any> = StreamQuery<object>,
>(
	query: Query,
	args: StreamQueryArgs<Query> | "skip",
	options?: {
		startOrder?: number;
		skipStreamIds?: string[];
	},
): { streamMessage: StreamMessage; deltas: StreamDelta[] }[] | undefined {
	// We hold onto and modify state directly to avoid re-running unnecessarily.
	const [state] = useState<{
		startOrder: number;
		threadId: string | undefined;
		deltaStreams:
			| Array<{
					streamMessage: StreamMessage;
					deltas: StreamDelta[];
			  }>
			| undefined;
	}>({
		startOrder: options?.startOrder ?? 0,
		deltaStreams: undefined,
		threadId: args === "skip" ? undefined : args.threadId,
	});
	const [cursors, setCursors] = useState<Record<string, number>>({});
	if (args !== "skip" && state.threadId !== args.threadId) {
		state.threadId = args.threadId;
		state.deltaStreams = undefined;
		state.startOrder = options?.startOrder ?? 0;
		setCursors({});
	}
	if (
		state.deltaStreams?.length ||
		(options?.startOrder && options.startOrder < state.startOrder)
	) {
		const cacheFriendlyStartOrder = options?.startOrder
			? // round down to the nearest 10 for some cache benefits
				options.startOrder - (options.startOrder % 10)
			: 0;
		if (cacheFriendlyStartOrder !== state.startOrder) {
			state.startOrder = cacheFriendlyStartOrder;
		}
	}

	// Get all the active streams
	const streamList = useQuery(
		query,
		args === "skip"
			? args
			: ({
					...args,
					streamArgs: {
						kind: "list",
						startOrder: state.startOrder,
					} as StreamArgs,
				} as FunctionArgs<Query>),
	) as
		| { streams: Extract<SyncStreamsReturnValue, { kind: "list" }> }
		| undefined;

	const streamMessages =
		args === "skip"
			? undefined
			: !streamList
				? state.deltaStreams?.map(({ streamMessage }) => streamMessage)
				: sorted(
						streamList.streams.messages.filter(
							({ streamId, order }) =>
								!options?.skipStreamIds?.includes(streamId) &&
								(!options?.startOrder || order >= options.startOrder),
						),
					);

	// Get the deltas for all the active streams, if any.
	const cursorQuery = useQuery(
		query,
		args === "skip" || !streamMessages?.length
			? ("skip" as const)
			: ({
					...args,
					streamArgs: {
						kind: "deltas",
						cursors: streamMessages.map(({ streamId }) => ({
							streamId,
							cursor: cursors[streamId] ?? 0,
						})),
					} as StreamArgs,
				} as FunctionArgs<Query>),
	) as
		| { streams: Extract<SyncStreamsReturnValue, { kind: "deltas" }> }
		| undefined;

	const newDeltas = cursorQuery?.streams.deltas;
	if (newDeltas?.length && streamMessages) {
		const newDeltasByStreamId = new Map<string, StreamDelta[]>();
		for (const delta of newDeltas) {
			const oldCursor = cursors[delta.streamId];
			if (oldCursor && delta.start < oldCursor) continue;
			const existing = newDeltasByStreamId.get(delta.streamId);
			if (existing) {
				const previousEnd = existing.at(-1)!.end;
				assert(
					previousEnd === delta.start,
					`Gap found in deltas for ${delta.streamId} jumping to ${delta.start} from ${previousEnd}`,
				);
				existing.push(delta);
			} else {
				assert(
					!oldCursor || oldCursor === delta.start,
					`Gap found - first delta after ${oldCursor} is ${delta.start} for stream ${delta.streamId}`,
				);
				newDeltasByStreamId.set(delta.streamId, [delta]);
			}
		}
		const newCursors: Record<string, number> = {};
		for (const { streamId } of streamMessages) {
			const cursor =
				newDeltasByStreamId.get(streamId)?.at(-1)?.end ?? cursors[streamId];
			if (cursor !== undefined) {
				newCursors[streamId] = cursor;
			}
		}
		setCursors(newCursors);

		// we defensively create a new object so object identity matches contents
		state.deltaStreams = streamMessages.map((streamMessage) => {
			const streamId = streamMessage.streamId;
			const old = state.deltaStreams?.find(
				(ds) => ds.streamMessage.streamId === streamId,
			);
			const newDeltas = newDeltasByStreamId.get(streamId);
			if (!newDeltas && streamMessage === old?.streamMessage) {
				return old;
			}
			return {
				streamMessage,
				deltas: [...(old?.deltas ?? []), ...(newDeltas ?? [])],
			};
		});
	}
	return state.deltaStreams;
}
