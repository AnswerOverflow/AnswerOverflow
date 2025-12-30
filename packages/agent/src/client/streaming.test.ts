import { beforeEach, describe, expect, test } from "vitest";
import { createThread } from "./index";
import type { GenericSchema, SchemaDefinition } from "convex/server";
import { streamText } from "ai";
import { components, initConvexTest } from "./setup.test";
import { mockModel } from "./mockModel";
import { compressUIMessageChunks, DeltaStreamer } from "./streaming";
import { getParts } from "../deltas";
import type { TestConvex } from "convex-test";

const defaultTestOptions = {
	throttleMs: 0,
	abortSignal: undefined,
	compress: null,
	onAsyncAbort: async () => {
		throw new Error("unexpected");
	},
};

const testMetadata = {
	order: 0,
	stepOrder: 0,
	agentName: "test agent",
	model: "test model",
	provider: "test provider",
	providerOptions: {},
	format: "UIMessageChunk" as const,
};

describe("DeltaStreamer", () => {
	let t: TestConvex<SchemaDefinition<GenericSchema, boolean>>;
	let threadId: string;
	beforeEach(async () => {
		t = initConvexTest();
		await t.run(async (ctx) => {
			threadId = await createThread(ctx, components.agent, {});
		});
	});
	test("should save chunks via DeltaStreamer", async () => {
		await t.run(async (ctx) => {
			const streamer = new DeltaStreamer(
				components.agent,
				ctx,
				{ ...defaultTestOptions },
				{ ...testMetadata, threadId },
			);
			const result = streamText({
				model: mockModel(),
				prompt: "Test prompt",
			});
			await streamer.consumeStream(result.toUIMessageStream());
			const streamId = streamer.streamId!;
			expect(streamId).toBeDefined();
			const deltas = await ctx.runQuery(components.agent.streams.listDeltas, {
				threadId,
				cursors: [{ cursor: 0, streamId }],
			});
			const { parts } = getParts(deltas);
			const stream = result.toUIMessageStream();
			for await (const part of stream) {
				const expected = parts.shift();
				expect(part).toEqual(expected);
			}
		});
	});
	test("should save all parts when throttleMs is 0", async () => {
		await t.run(async (ctx) => {
			const streamer = new DeltaStreamer(
				components.agent,
				ctx,
				{ ...defaultTestOptions, throttleMs: 0 },
				{ ...testMetadata, threadId },
			);
			const result = streamText({
				model: mockModel({
					content: [
						// The mockModel splits these into deltas based on spaces
						{ type: "text", text: "A B C" },
						{ type: "reasoning", text: "D E F" },
					],
				}),
				prompt: "Test prompt",
			});
			await streamer.consumeStream(result.toUIMessageStream());
			const streamId = streamer.streamId!;
			expect(streamId).toBeDefined();
			const deltas = await ctx.runQuery(components.agent.streams.listDeltas, {
				threadId,
				cursors: [{ cursor: 0, streamId }],
			});
			const { parts } = getParts(deltas);
			const expected = [
				{ type: "start" },
				{ type: "start-step" },
				{ type: "text-start" },
				{ type: "text-delta", delta: "A" },
				{ type: "text-delta", delta: " B" },
				{ type: "text-delta", delta: " C" },
				{ type: "text-end" },
				{ type: "reasoning-start" },
				{ type: "reasoning-delta", delta: "D" },
				{ type: "reasoning-delta", delta: " E" },
				{ type: "reasoning-delta", delta: " F" },
				{ type: "reasoning-end" },
				{ type: "finish-step" },
				{ type: "finish" },
			];
			for (const expectedPart of expected) {
				const part = parts.shift();
				expect(part).toBeDefined();
				expect(part).toMatchObject(expectedPart);
			}
		});
	});

	test("should save compressed parts via DeltaStreamer", async () => {
		await t.run(async (ctx) => {
			const streamer = new DeltaStreamer(
				components.agent,
				ctx,
				{
					throttleMs: 1000,
					abortSignal: undefined,
					compress: compressUIMessageChunks,
					onAsyncAbort: async () => {
						throw new Error("async abort");
					},
				},
				{
					...testMetadata,
					threadId,
				},
			);
			const result = streamText({
				model: mockModel({
					content: [
						// The mockModel splits these into deltas based on spaces
						{ type: "text", text: "A B C" },
						{ type: "text", text: "D E F" },
						{ type: "reasoning", text: "J K L" },
						{ type: "text", text: "M N O" },
					],
				}),
				prompt: "Test prompt",
				// experimental_transform: smoothStream({ chunking: "line" }),
				onError: (error) => {
					console.error(error);
				},
			});
			await streamer.consumeStream(result.toUIMessageStream());
			const streamId = streamer.streamId!;
			expect(streamId).toBeDefined();
			const deltas = await ctx.runQuery(components.agent.streams.listDeltas, {
				threadId,
				cursors: [{ cursor: 0, streamId }],
			});
			const { parts } = getParts(deltas);
			const expected = [
				{ type: "start" },
				{ type: "start-step" },
				{ type: "text-start" },
				// These are collapsed into a single delta
				{ type: "text-delta", delta: "A B C" },
				{ type: "text-end" },
				{ type: "text-start" },
				{ type: "text-delta", delta: "D E F" },
				{ type: "text-end" },
				{ type: "reasoning-start" },
				{ type: "reasoning-delta", delta: "J K L" },
				{ type: "reasoning-end" },
				{ type: "text-start" },
				{ type: "text-delta", delta: "M N O" },
				{ type: "text-end" },
				{ type: "finish-step" },
				{ type: "finish" },
			];
			for (const expectedPart of expected) {
				const part = parts.shift();
				expect(part).toBeDefined();
				expect(part).toMatchObject(expectedPart);
			}
		});
	});
	// TODO: test errors & aborted states
	// TODO: test fetching partial stream data - syncStreams w/ cursors
});
