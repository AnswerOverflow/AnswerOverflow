"use server";

import { createHttpContext } from "@packages/agent/http";
import { createSandboxTools, createVirtualBash } from "@packages/ai/tools";
import { api } from "@packages/database/convex/_generated/api";
import {
	createChatAgent,
	createRepoInstructions,
	type RepoContext,
	type ServerContext,
} from "@packages/database/convex/shared/chatAgent";
import { Database } from "@packages/database/database";
import { defaultModelId, getModelById } from "@packages/database/models";
import { createProxyComponent } from "@packages/database/proxy-component";
import { Effect } from "effect";
import { createAnswerOverflowTools } from "../mcp/tools";
import { runtime } from "../runtime";

export async function streamChat(args: {
	threadId: string;
	repos: RepoContext[];
	serverContext: ServerContext | null;
	promptMessageId: string;
	modelId: string;
}) {
	const ctx = createHttpContext({
		convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
		backendAccessToken: process.env.BACKEND_ACCESS_TOKEN!,
	});
	const component = createProxyComponent(api.private.agent_wrappers);

	const agent = createChatAgent(component, args.modelId ?? defaultModelId);

	const modelId = args.modelId ?? defaultModelId;

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
