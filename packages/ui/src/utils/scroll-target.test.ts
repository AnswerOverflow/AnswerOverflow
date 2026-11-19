import { describe, expect, it } from "vitest";
import {
	messageElementIds,
	messageIdFromHash,
	resolveScrollTarget,
} from "./scroll-target";

describe("messageIdFromHash", () => {
	it("reads the id out of a solution hash", () => {
		expect(messageIdFromHash("#solution-1462183916965466295")).toBe(
			"1462183916965466295",
		);
	});

	it("reads the id out of a message hash", () => {
		expect(messageIdFromHash("#message-1462183916965466295")).toBe(
			"1462183916965466295",
		);
	});

	it("accepts a hash without the leading #", () => {
		expect(messageIdFromHash("solution-123")).toBe("123");
	});

	it("ignores hashes that do not point at a message", () => {
		expect(messageIdFromHash("#pricing")).toBeNull();
		expect(messageIdFromHash("#solution")).toBeNull();
		expect(messageIdFromHash("")).toBeNull();
		expect(messageIdFromHash(null)).toBeNull();
	});

	it("ignores non numeric ids", () => {
		expect(messageIdFromHash("#solution-<script>")).toBeNull();
		expect(messageIdFromHash("#message-abc")).toBeNull();
	});
});

describe("resolveScrollTarget", () => {
	const getItemId = (item: { id: string }) => item.id;
	const loaded = [{ id: "1" }, { id: "2" }, { id: "3" }];

	it("scrolls to an item that is already loaded", () => {
		expect(
			resolveScrollTarget({
				items: loaded,
				getItemId,
				targetId: "3",
				isDone: false,
			}),
		).toEqual({ type: "scroll", index: 2 });
	});

	it("loads more pages when the item has not been paged in", () => {
		expect(
			resolveScrollTarget({
				items: loaded,
				getItemId,
				targetId: "9",
				isDone: false,
			}),
		).toEqual({ type: "loadMore" });
	});

	it("loads more pages when nothing is loaded yet", () => {
		expect(
			resolveScrollTarget({
				items: [],
				getItemId,
				targetId: "9",
				isDone: false,
			}),
		).toEqual({ type: "loadMore" });
	});

	it("gives up only once every page is loaded", () => {
		expect(
			resolveScrollTarget({
				items: loaded,
				getItemId,
				targetId: "9",
				isDone: true,
			}),
		).toEqual({ type: "unreachable" });
	});
});

describe("messageElementIds", () => {
	it("covers both the reply and the solution rendering of a message", () => {
		expect(messageElementIds("123")).toEqual(["message-123", "solution-123"]);
	});
});
