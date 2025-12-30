import type { ToolResultPart } from "ai";
import type { Infer } from "convex/values";
import { validate } from "convex-helpers/validators";
import fs from "fs";
import path from "path";
import { describe, expect, test } from "vitest";
import type { ActionCtx, AgentComponent } from "./client/types";
import { api } from "./component/_generated/api";
import type { SerializedContent } from "./mapping";
import {
	guessMimeType,
	serializeContent,
	serializeDataOrUrl,
	serializeMessage,
	toModelMessage,
	toModelMessageContent,
	toModelMessageDataOrUrl,
} from "./mapping";
import { vMessage, type vToolResultPart } from "./validators";

const testAssetsDir = path.join(__dirname, "../test-assets");
const testFiles = [
	"book.svg",
	"bump.jpeg",
	"stack.png",
	"favicon.ico",
	"convex-logo.svg",
	"stack-light@3x.webp",
];

function fileToArrayBuffer(filePath: string): ArrayBuffer {
	const buf = fs.readFileSync(filePath);
	return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

// we need to bring back the assets folder for this test to work
describe.skip("mapping", () => {
	test("infers correct mimeType for all test-assets", () => {
		const expected: { [key: string]: string } = {
			"book.svg": "image/svg+xml", // <svg
			"bump.jpeg": "image/jpeg",
			"stack.png": "image/png",
			"favicon.ico": "application/octet-stream", // fallback for ico
			"convex-logo.svg": "image/svg+xml", // <?xm
			"stack-light@3x.webp": "image/webp",
			"cat.gif": "image/gif",
		};
		for (const file of testFiles) {
			const ab = fileToArrayBuffer(path.join(testAssetsDir, file));
			const mime = guessMimeType(ab);
			expect(mime).toBe(expected[file]);
		}
	});

	test("turns Uint8Array into ArrayBuffer and round-trips", () => {
		const arr = new Uint8Array([1, 2, 3, 4, 5]);
		// serializeDataOrUrl should return the same ArrayBuffer
		const ser = serializeDataOrUrl(arr);
		expect(ser).toBeInstanceOf(ArrayBuffer);
		expect(new Uint8Array(ser as ArrayBuffer)).toEqual(arr);
		// toModelMessageDataOrUrl should return the same ArrayBuffer
		const deser = toModelMessageDataOrUrl(ser);
		expect(deser).toBeInstanceOf(ArrayBuffer);
		expect(new Uint8Array(deser as ArrayBuffer)).toEqual(arr);
	});

	test("round-trip serialize/deserialize message", async () => {
		const message = {
			role: "user" as const,
			content: "hello world",
			providerOptions: {},
		};
		// Fake ctx and component
		const ctx = {
			runAction: async () => undefined,
			runMutation: async () => undefined,
			storage: {
				store: async () => "storageId",
				getUrl: async () => "https://example.com/file",
				delete: async () => undefined,
			},
		} as unknown as ActionCtx;
		const component = api as unknown as AgentComponent;
		const { message: ser } = await serializeMessage(ctx, component, message);
		// Use is for type validation
		expect(validate(vMessage, ser)).toBeTruthy();
		const round = toModelMessage(ser);
		expect(round).toEqual(message);
	});

	test("tool output round-trips", async () => {
		const toolResult = {
			type: "tool-result" as const,
			toolCallId: "tool-call-id",
			toolName: "tool-name",
			output: {
				type: "text",
				value: "hello world",
			},
		} satisfies ToolResultPart;
		const [result] = toModelMessageContent([toolResult]);
		expect(result).toMatchObject(toolResult);
		const {
			content: [roundtrip],
		} = await serializeContent({} as ActionCtx, {} as AgentComponent, [
			result as ToolResultPart,
		]);
		expect(roundtrip).toMatchObject(toolResult);
	});

	test("tool results get normalized to output", async () => {
		const toolResult = {
			type: "tool-result" as const,
			toolCallId: "tool-call-id",
			toolName: "tool-name",
			result: "hello world",
		} satisfies Infer<typeof vToolResultPart>;
		const expected = {
			type: "tool-result",
			toolCallId: "tool-call-id",
			toolName: "tool-name",
			output: {
				type: "text",
				value: "hello world",
			},
		};
		const [deserialized] = toModelMessageContent([toolResult]);
		expect(deserialized).toMatchObject(expected);
		const {
			content: [serialized],
		} = await serializeContent({} as ActionCtx, {} as AgentComponent, [
			toolResult,
		]);
		expect(serialized).toMatchObject(expected);
	});

	test("saving files returns fileIds when too big", async () => {
		// Make a big file
		const bigArr = new Uint8Array(1024 * 65).fill(1);
		const ab = bigArr.buffer.slice(
			bigArr.byteOffset,
			bigArr.byteOffset + bigArr.byteLength,
		);
		let called = false;
		const ctx = {
			runAction: async () => undefined,
			runMutation: async (_fn: unknown, _args: unknown) => {
				called = true;
				return { fileId: "file-123", storageId: "storage-123" };
			},
			storage: {
				store: async () => "storageId",
				getUrl: async () => "https://example.com/file",
				delete: async () => undefined,
			},
		} as unknown as ActionCtx;
		const component = api as unknown as AgentComponent;
		const content = [
			{
				type: "file" as const,
				data: ab,
				filename: "bigfile.bin",
				mimeType: "application/octet-stream",
				providerOptions: {},
			},
		];
		const { content: ser, fileIds } = await serializeContent(
			ctx,
			component,
			content,
		);
		expect(called).toBe(true);
		expect(fileIds).toEqual(["file-123"]);
		// Should have replaced data with a URL
		const serArr = ser as SerializedContent;
		expect(typeof (serArr as { data: unknown }[])[0]!.data).toBe("string");
		expect((serArr as { data: unknown }[])[0]!.data as string).toMatch(
			/^https?:\/\//,
		);
	});

	test("sanity: fileIds are not returned for small files", async () => {
		const arr = new Uint8Array([1, 2, 3, 4, 5]);
		const ab = arr.buffer.slice(
			arr.byteOffset,
			arr.byteOffset + arr.byteLength,
		);
		const ctx = {
			runAction: async () => undefined,
			runMutation: async () => ({
				fileId: "file-123",
				storageId: "storage-123",
			}),
			storage: {
				store: async () => "storageId",
				getUrl: async () => "https://example.com/file",
				delete: async () => undefined,
			},
		} as unknown as ActionCtx;
		const component = api as unknown as AgentComponent;
		const content = [
			{
				type: "file" as const,
				data: ab,
				filename: "smallfile.bin",
				mimeType: "application/octet-stream",
				providerOptions: {},
			},
		];
		const { fileIds } = await serializeContent(ctx, component, content);
		expect(fileIds).toBeUndefined();
	});
});
