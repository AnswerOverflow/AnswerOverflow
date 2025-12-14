import { expect, it } from "@effect/vitest";
import type { Message } from "discord.js";
import { describe } from "vitest";
import { isHumanMessage, removeDiscordMarkdown } from "./message-utils";

describe("message-utils", () => {
	describe("isHumanMessage", () => {
		it("returns false for bot messages", () => {
			const mockMessage = {
				author: {
					bot: true,
					system: false,
				},
			} as unknown as Message;

			expect(isHumanMessage(mockMessage)).toBe(false);
		});

		it("returns false for system messages", () => {
			const mockMessage = {
				author: {
					bot: false,
					system: true,
				},
			} as unknown as Message;

			expect(isHumanMessage(mockMessage)).toBe(false);
		});

		it("returns true for regular user messages", () => {
			const mockMessage = {
				author: {
					bot: false,
					system: false,
				},
			} as unknown as Message;

			expect(isHumanMessage(mockMessage)).toBe(true);
		});
	});

	describe("removeDiscordMarkdown", () => {
		it("removes asterisks", () => {
			expect(removeDiscordMarkdown("Hello *world*")).toBe("Hello world");
		});

		it("removes underscores", () => {
			expect(removeDiscordMarkdown("Hello _world_")).toBe("Hello world");
		});

		it("removes tildes", () => {
			expect(removeDiscordMarkdown("Hello ~world~")).toBe("Hello world");
		});

		it("removes backticks", () => {
			expect(removeDiscordMarkdown("Hello `world`")).toBe("Hello world");
		});

		it("removes multiple markdown characters", () => {
			expect(removeDiscordMarkdown("*bold* _italic_ ~strike~ `code`")).toBe(
				"bold italic strike code",
			);
		});

		it("preserves other characters", () => {
			expect(removeDiscordMarkdown("Hello world!")).toBe("Hello world!");
		});

		it("handles empty strings", () => {
			expect(removeDiscordMarkdown("")).toBe("");
		});
	});
});
