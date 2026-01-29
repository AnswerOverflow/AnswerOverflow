"use server";

import { stepCountIs } from "@packages/agent";
import { createHttpContext } from "@packages/agent/http";
import { createSandboxTools, createVirtualBash } from "@packages/ai/tools";
import { api } from "@packages/database/convex/_generated/api";
import {
	createChatAgent,
	createRepoInstructions,
	type RepoContext,
	type ServerContext,
	type TracingOptions,
} from "@packages/database/convex/shared/chatAgent";
import { Database } from "@packages/database/database";
import { defaultModelId, getModelById } from "@packages/database/models";
import { createProxyComponent } from "@packages/database/proxy-component";
import { withTracing } from "@posthog/ai";
import { Effect } from "effect";
import { PostHog } from "posthog-node";
import { createAnswerOverflowTools } from "../mcp/tools";
import { runtime } from "../runtime";

let posthogClient: PostHog | null = null;

function getPostHogClient(): PostHog | null {
	if (posthogClient) return posthogClient;

	const apiKey = process.env.NEXT_PUBLIC_POSTHOG_TOKEN;
	if (!apiKey) {
		console.warn("[chat] PostHog API key not set, LLM analytics disabled");
		return null;
	}

	posthogClient = new PostHog(apiKey, {
		host: "https://us.posthog.com",
	});

	return posthogClient;
}

export async function streamChat(args: {
	threadId: string;
	repos: RepoContext[];
	serverContext: ServerContext | null;
	promptMessageId: string;
	modelId: string;
	userId?: string;
	userPlan?: "FREE" | "PRO";
}) {
	const ctx = createHttpContext({
		convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
		backendAccessToken: process.env.BACKEND_ACCESS_TOKEN!,
	});
	const component = createProxyComponent(api.private.agent_wrappers);

	const modelId = args.modelId ?? defaultModelId;

	const phClient = getPostHogClient();
	const tracing: TracingOptions | undefined = phClient
		? {
				wrapModel: (model, opts) =>
					withTracing(model, phClient, {
						posthogTraceId: opts.traceId,
						posthogDistinctId: opts.distinctId,
						posthogProperties: opts.properties,
					}),
				traceId: args.threadId,
				distinctId: args.userId,
				properties: {
					modelId,
					plan: args.userPlan ?? "FREE",
					hasRepo: args.repos.length > 0,
					hasServerContext: !!args.serverContext,
					serverDiscordId: args.serverContext?.discordId,
				},
			}
		: undefined;

	const agent = createChatAgent(component, modelId, tracing);

	const virtualBash = createVirtualBash({
		gitClone: {
			credentialProvider: async () => process.env.GITHUB_TOKEN ?? null,
			allowedHosts: ["github.com"],
		},
	});

	const repos = args.repos ?? [];
	const serverContext = args.serverContext;
	const workdir = repos.length === 1 ? "/repo" : "/repos";
	const sandboxTools = createSandboxTools({ virtualBash, workdir });
	const answerOverflowTools = createAnswerOverflowTools({
		buildUrl: (path) => `https://www.answeroverflow.com${path}`,
		serverId: serverContext?.discordId,
		includeServerInfo: !serverContext,
	});

	const model = getModelById(modelId);
	const modelName = model?.name ?? "Unknown Model";
	const systemOverride = createRepoInstructions(
		repos,
		modelName,
		serverContext ?? undefined,
	);
	if (repos.length > 0) {
		await Effect.gen(function* () {
			const database = yield* Database;
			yield* database.private.agent_wrappers.updateAgentStatus({
				threadId: args.threadId,
				status: "cloning_repo",
			});
		}).pipe(runtime.runPromise);

		for (const repo of repos) {
			const clonePath =
				repos.length === 1 ? "/repo" : `/repos/${repo.owner}/${repo.repo}`;
			await virtualBash.exec(
				`git clone https://github.com/${repo.owner}/${repo.repo} ${clonePath}`,
			);
		}
	}

	await Effect.gen(function* () {
		const database = yield* Database;
		yield* database.private.agent_wrappers.updateAgentStatus({
			threadId: args.threadId,
			status: "thinking",
		});
	}).pipe(runtime.runPromise);

	// set status to responding
	await Effect.gen(function* () {
		const database = yield* Database;
		yield* database.private.agent_wrappers.updateAgentStatus({
			threadId: args.threadId,
			status: "responding",
		});
	}).pipe(runtime.runPromise);
	try {
		await agent.streamText(
			ctx,
			{ threadId: args.threadId },
			{
				promptMessageId: args.promptMessageId,
				system: systemOverride,
				tools: {
					...agent.options.tools,
					...answerOverflowTools,
					...sandboxTools,
				},
				stopWhen: stepCountIs(150),
				providerOptions: {
					gateway: {
						order: ["cerebras"],
					},
				},
				temperature: 0.4,
			},
			{ saveStreamDeltas: { throttleMs: 250, returnImmediately: false } },
		);
	} catch (streamError) {
		console.error("[streamChat] agent.streamText failed:", streamError);
		throw streamError;
	}
	await Effect.gen(function* () {
		const database = yield* Database;
		yield* database.private.agent_wrappers.updateAgentStatus({
			threadId: args.threadId,
			status: "idle",
		});
	}).pipe(runtime.runPromise);
}
