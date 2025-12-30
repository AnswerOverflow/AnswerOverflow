import { Agent } from "@packages/agent";
import { gateway } from "ai";
import { components } from "../_generated/api";

export const chatAgent = new Agent(components.agent, {
	name: "Chat Agent",
	languageModel: gateway("anthropic/claude-sonnet-4-20250514"),
	instructions: `You are a helpful AI assistant for testing the Convex Agent implementation.
You have access to tools from AnswerOverflow that can help search Discord community content.

Be friendly, concise, and helpful. When using tools, explain what you're doing.`,
	maxSteps: 5,
});
