import { describe, expect, it } from "vitest";
import { buildMCPAgentLandPrompt } from "./mcp-agent-land-modal";

describe("buildMCPAgentLandPrompt", () => {
	it("includes the thread title when provided", () => {
		expect(
			buildMCPAgentLandPrompt({
				mcpUrl: "https://supabase.answeroverflow.com/mcp",
				serverName: "Supabase",
				threadTitle: "RLS policy not applying",
			}),
		).toBe(
			"Use the Answer Overflow MCP at https://supabase.answeroverflow.com/mcp to search the Supabase Discord. I'm looking at: RLS policy not applying",
		);
	});

	it("falls back to the community prompt without a thread title", () => {
		const expected =
			"Use the Answer Overflow MCP at https://supabase.answeroverflow.com/mcp to search the Supabase Discord.";
		expect(
			buildMCPAgentLandPrompt({
				mcpUrl: "https://supabase.answeroverflow.com/mcp",
				serverName: "Supabase",
			}),
		).toBe(expected);
		expect(
			buildMCPAgentLandPrompt({
				mcpUrl: "https://supabase.answeroverflow.com/mcp",
				serverName: "Supabase",
				threadTitle: null,
			}),
		).toBe(expected);
	});
});
