import type { GatewayModelId } from "ai";
import { v } from "convex/values";

type ModelSchema = {
	id: string;
	name: string;
	chef: string;
	chefSlug: string;
	providers: string[];
	gatewayId: GatewayModelId;
};

export const models: ModelSchema[] = [
	{
		id: "glm-4.7",
		name: "GLM-4.7",
		chef: "ZAI",
		chefSlug: "zai",
		providers: ["zai"],
		gatewayId: "zai/glm-4.7",
	},
	{
		id: "glm-4.6",
		name: "GLM-4.6",
		chef: "ZAI",
		chefSlug: "zai",
		providers: ["cerebras", "zai"],
		gatewayId: "zai/glm-4.6",
	},
	{
		id: "minimax-m2",
		name: "MiniMax M2",
		chef: "MiniMax",
		chefSlug: "minimax",
		providers: ["minimax"],
		gatewayId: "minimax/minimax-m2",
	},
	{
		id: "gpt-5.2",
		name: "GPT-5.2",
		chef: "OpenAI",
		chefSlug: "openai",
		providers: ["openai", "azure"],
		gatewayId: "openai/gpt-5.2",
	},
	{
		id: "gpt-5.1-thinking",
		name: "GPT-5.1 Thinking",
		chef: "OpenAI",
		chefSlug: "openai",
		providers: ["openai", "azure"],
		gatewayId: "openai/gpt-5.2-thinking",
	},
	// {
	// 	id: "claude-opus-4.5",
	// 	name: "Claude 4.5 Opus",
	// 	chef: "Anthropic",
	// 	chefSlug: "anthropic",
	// 	providers: ["anthropic", "azure", "google", "amazon-bedrock"],
	// 	gatewayId: "anthropic/claude-opus-4.5",
	// },
	{
		id: "claude-sonnet-4.5",
		name: "Claude 4.5 Sonnet",
		chef: "Anthropic",
		chefSlug: "anthropic",
		providers: ["anthropic", "azure", "google", "amazon-bedrock"],
		gatewayId: "anthropic/claude-sonnet-4.5",
	},
	{
		id: "gemini-2.5-flash",
		name: "Gemini 2.5 Flash",
		chef: "Google",
		chefSlug: "google",
		providers: ["google"],
		gatewayId: "google/gemini-2.5-flash",
	},
] satisfies ModelSchema[];

export type Model = (typeof models)[number];
export type ModelId = Model["id"];

export const modelIds = models.map((m) => m.id) as unknown as [
	ModelId,
	...ModelId[],
];
export const modelIdSet = new Set<string>(modelIds);
export const defaultModelId: ModelId = "glm-4.7";

export const vModelId = v.string();
export function getModelById(id: string): Model | undefined {
	return models.find((m) => m.id === id);
}

export function isValidModelId(id: string): id is ModelId {
	return modelIdSet.has(id);
}
