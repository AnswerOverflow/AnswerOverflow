import type { Message } from "discord.js";
import { describe, expect, it } from "vitest";
import { includeThreadStarter } from "./indexing";

function message(id: string): Message {
	return { id } as Message;
}

describe("includeThreadStarter", () => {
	it("adds a missing starter in snowflake order", () => {
		const result = includeThreadStarter(
			[message("100000000000000003"), message("100000000000000005")],
			message("100000000000000001"),
		);

		expect(result.map((item) => item.id)).toEqual([
			"100000000000000001",
			"100000000000000003",
			"100000000000000005",
		]);
	});

	it("does not duplicate an existing starter", () => {
		const starter = message("100000000000000001");
		const messages = [starter, message("100000000000000003")];

		expect(includeThreadStarter(messages, starter)).toBe(messages);
	});

	it("leaves messages unchanged when Discord has no starter", () => {
		const messages = [message("100000000000000003")];

		expect(includeThreadStarter(messages, null)).toBe(messages);
	});
});
