import { Agent } from "@packages/agent";
import { gateway } from "ai";
import { components } from "../_generated/api";

export const threadSummaryAgent = new Agent(components.agent, {
	name: "Thread Summary Agent",
	languageModel: gateway("google/gemini-2.0-flash"),
	instructions: `You are a helpful assistant that summarizes Discord thread conversations.
Your task is to create a clear, concise summary of a Discord thread discussion.

Guidelines:
- Focus on the main question/problem being discussed
- Highlight any solutions or key insights provided
- Keep the summary to 2-4 sentences
- Use clear, professional language
- If there's a marked solution, emphasize it
- Don't include usernames or Discord-specific syntax`,
});
