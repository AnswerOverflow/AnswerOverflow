import { describe, expect, test } from "vitest";
import { hasRenderableContent } from "./discord";

describe("hasRenderableContent", () => {
	test("returns false for empty content with no extras", () => {
		expect(
			hasRenderableContent({ message: { content: "" }, attachments: [] }),
		).toBe(false);
	});

	test("returns false for whitespace-only content with no extras", () => {
		expect(
			hasRenderableContent({
				message: { content: "   \n\t" },
				attachments: [],
			}),
		).toBe(false);
	});

	test("returns true for text content", () => {
		expect(
			hasRenderableContent({ message: { content: "hello" }, attachments: [] }),
		).toBe(true);
	});

	test("returns true for whitespace-only content with an attachment", () => {
		expect(
			hasRenderableContent({
				message: { content: "  " },
				attachments: [{ url: "https://example.com/a.png" }],
			}),
		).toBe(true);
	});

	test("returns true for empty content with an embed", () => {
		expect(
			hasRenderableContent({
				message: { content: "", embeds: [{ title: "embed" }] },
				attachments: [],
			}),
		).toBe(true);
	});

	test("returns true for empty content with a sticker", () => {
		expect(
			hasRenderableContent({
				message: { content: "", stickers: [{ id: "1" }] },
				attachments: [],
			}),
		).toBe(true);
	});

	test("returns true for empty content with a component", () => {
		expect(
			hasRenderableContent({
				message: { content: "", components: [{ type: 1 }] },
				attachments: [],
			}),
		).toBe(true);
	});

	test("returns true for empty content with a snapshot", () => {
		expect(
			hasRenderableContent({
				message: { content: "", snapshot: { message: {} } },
				attachments: [],
			}),
		).toBe(true);
	});

	test("returns false for empty arrays and empty content", () => {
		expect(
			hasRenderableContent({
				message: {
					content: "",
					embeds: [],
					stickers: [],
					components: [],
					snapshot: null,
				},
				attachments: [],
			}),
		).toBe(false);
	});

	test("returns false for null and undefined extras with empty content", () => {
		expect(
			hasRenderableContent({
				message: {
					content: "",
					embeds: null,
					stickers: undefined,
					components: null,
					snapshot: undefined,
				},
				attachments: null,
			}),
		).toBe(false);
	});
});
