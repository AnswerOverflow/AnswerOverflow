import { Agent, createTool } from "@packages/agent";
import { gateway } from "ai";
import { z } from "zod";
import { components } from "../_generated/api";

const getCurrentTime = createTool({
	description: "Get the current time in a specific timezone",
	args: z.object({
		timezone: z
			.string()
			.optional()
			.describe("The timezone to get time for (e.g., 'America/New_York')"),
	}),
	handler: async (_ctx, args): Promise<string> => {
		const now = new Date();
		const options: Intl.DateTimeFormatOptions = {
			timeZone: args.timezone ?? "UTC",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			timeZoneName: "short",
		};
		return `The current time is ${now.toLocaleTimeString("en-US", options)}`;
	},
});

const rollDice = createTool({
	description: "Roll one or more dice with a specified number of sides",
	args: z.object({
		sides: z
			.number()
			.min(2)
			.max(100)
			.describe("Number of sides on the die (default: 6)"),
		count: z
			.number()
			.min(1)
			.max(10)
			.optional()
			.describe("Number of dice to roll (default: 1)"),
	}),
	handler: async (_ctx, args): Promise<string> => {
		const count = args.count ?? 1;
		const rolls: number[] = [];
		for (let i = 0; i < count; i++) {
			rolls.push(Math.floor(Math.random() * args.sides) + 1);
		}
		const total = rolls.reduce((sum, roll) => sum + roll, 0);
		if (count === 1) {
			return `Rolled a d${args.sides}: ${rolls[0]}`;
		}
		return `Rolled ${count}d${args.sides}: [${rolls.join(", ")}] = ${total}`;
	},
});

export const chatAgent = new Agent(components.agent, {
	name: "Chat Agent",
	languageModel: gateway("anthropic/claude-sonnet-4-20250514"),
	instructions: `You are a helpful AI assistant for testing the Convex Agent implementation.
You have access to tools that can help with various tasks.

Be friendly, concise, and helpful. When using tools, explain what you're doing.`,
	tools: {
		getCurrentTime,
		rollDice,
	},
	maxSteps: 5,
});
