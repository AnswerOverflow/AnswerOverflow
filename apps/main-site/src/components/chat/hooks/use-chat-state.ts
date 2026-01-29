"use client";

import {
	optimisticallySendMessage,
	useUIMessages,
} from "@packages/agent/react";
import { api } from "@packages/database/convex/_generated/api";
import type { AgentStatus } from "@packages/database/convex/schema";
import { defaultModelId, getModelById } from "@packages/database/models";
import { trackEvent, usePostHog } from "@packages/ui/analytics/client";
import {
	useAuthClient,
	useSession,
} from "@packages/ui/components/convex-client-provider";
import { useQuery } from "@tanstack/react-query";
import { useAction, useMutation } from "convex/react";
import { useState } from "react";
import type { DiscordServerContext } from "@/lib/discord-server-types";
import { streamChat } from "@/lib/server/chat";
import { useAuthenticatedQuery } from "@/lib/use-authenticated-query";
import type { GitHubRepo } from "../types";

export type UseChatStateProps = {
	initialThreadId?: string;
	initialRepo?: GitHubRepo;
	initialServer?: DiscordServerContext;
	initialInput?: string;
};

export type RateLimitStatus = {
	remaining: number;
	resetsAt: number | null;
	isAnonymous: boolean;
};

export function useChatState({
	initialThreadId,
	initialRepo,
	initialServer,
	initialInput,
}: UseChatStateProps) {
	const session = useSession({ allowAnonymous: true });
	const isAuthenticated = !!session?.data;
	const authClient = useAuthClient();
	const posthog = usePostHog();

	const [input, setInput] = useState(initialInput ?? "");
	const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(
		initialRepo ?? null,
	);
	const [serverOverride, setServerOverride] = useState<
		DiscordServerContext | null | undefined
	>(initialServer ?? undefined);
	const [modelOverride, setModelOverride] = useState<string | null>(null);
	const [optimisticUserMessage, setOptimisticUserMessage] = useState<
		string | null
	>(null);
	const [currentThreadId, setCurrentThreadId] = useState<string | undefined>(
		initialThreadId,
	);

	const rateLimitStatus = useAuthenticatedQuery(
		api.chat.usage.getMessageUsageStatus,
		{},
		{ allowAnonymous: true },
	);

	const threadMetadata = useAuthenticatedQuery(
		api.chat.mutations.getChatThreadMetadata,
		currentThreadId ? { threadId: currentThreadId } : "skip",
		{ allowAnonymous: true },
	);

	const uiMessagesArgs =
		currentThreadId && isAuthenticated ? { threadId: currentThreadId } : "skip";
	const { results: messages } = useUIMessages(
		api.chat.mutations.listMessages,
		uiMessagesArgs,
		{ initialNumItems: 50, stream: true },
	);

	const effectiveOptimisticMessage =
		optimisticUserMessage && messages.length === 0
			? optimisticUserMessage
			: null;

	const sendMessage = useMutation(
		api.chat.mutations.sendMessage,
	).withOptimisticUpdate((store, args) => {
		if (args.threadId) {
			optimisticallySendMessage(api.chat.mutations.listMessages)(store, {
				threadId: args.threadId,
				prompt: args.prompt,
			});
		}
	});

	const repoFromThread = threadMetadata?.repos?.[0];
	const serverFromThread = threadMetadata?.serverContext ?? null;

	const effectiveRepo =
		selectedRepo ??
		(repoFromThread
			? {
					owner: repoFromThread.owner,
					repo: repoFromThread.repo,
					filePath: repoFromThread.filePath ?? undefined,
				}
			: null);

	const effectiveServerContext =
		serverOverride === undefined ? (serverFromThread ?? null) : serverOverride;

	const serverInviteUrl = serverOverride?.invite;

	const getDiscordInviteInfo = useAction(
		api.public.github.getDiscordInviteInfo,
	);
	const discordInviteQuery = useQuery({
		queryKey: [
			"discord-invite-info",
			effectiveRepo?.owner,
			effectiveRepo?.repo,
		],
		queryFn: async () => {
			if (!effectiveRepo) return null;
			return getDiscordInviteInfo({
				owner: effectiveRepo.owner,
				repo: effectiveRepo.repo,
			});
		},
		enabled: !!effectiveRepo,
		staleTime: 1000 * 60 * 60,
	});

	const showDiscordCta =
		effectiveRepo &&
		discordInviteQuery.data?.hasDiscordInvite &&
		!discordInviteQuery.data.isOnAnswerOverflow;

	const serverNotIndexed =
		effectiveServerContext !== null && !effectiveServerContext.hasBot;

	const model = modelOverride ?? threadMetadata?.modelId ?? defaultModelId;
	const selectedModelData = getModelById(model);
	const isAnonymous = rateLimitStatus?.isAnonymous ?? false;
	const selectedModelRequiresSignIn =
		selectedModelData?.requiresSignIn && isAnonymous;
	const agentStatus: AgentStatus = threadMetadata?.agentStatus ?? "idle";
	const agentError = threadMetadata?.agentError ?? null;
	const isAgentWorking = agentStatus !== "idle" && agentStatus !== "error";

	const title =
		threadMetadata?.title ??
		(effectiveRepo
			? `Chat with ${effectiveRepo.owner}/${effectiveRepo.repo}`
			: effectiveServerContext
				? `Chat with ${effectiveServerContext.name}`
				: null);

	const placeholder = effectiveRepo
		? `Ask about ${effectiveRepo.owner}/${effectiveRepo.repo}...`
		: effectiveServerContext
			? `Ask about ${effectiveServerContext.name}...`
			: "Send a message...";

	const hasMessages = messages.length > 0 || effectiveOptimisticMessage;
	const showEmptyState = !currentThreadId && !hasMessages;

	const handleSignIn = async () => {
		trackEvent(
			"Chat Sign In Click",
			{ location: "rate_limit_warning" },
			posthog,
		);
		await authClient.signIn.social({
			provider: "discord",
			callbackURL: window.location.href,
		});
	};

	const handleSubmit = async (text: string) => {
		if (!text.trim()) return;

		setInput("");

		const isNewThread = !currentThreadId;
		if (isNewThread) {
			setOptimisticUserMessage(text);
		}

		trackEvent(
			"Chat Message Sent",
			{
				threadId: currentThreadId ?? null,
				repoOwner: effectiveRepo?.owner ?? null,
				repoName: effectiveRepo?.repo ?? null,
				modelId: model,
				isNewThread,
			},
			posthog,
		);

		const { threadId, messageId } = await sendMessage({
			threadId: currentThreadId,
			prompt: text,
			repoContext: effectiveRepo
				? {
						owner: effectiveRepo.owner,
						repo: effectiveRepo.repo,
						filePath: effectiveRepo.filePath,
					}
				: undefined,
			serverDiscordId: effectiveServerContext?.discordId,
			modelId: model,
		});

		if (isNewThread && threadId) {
			setCurrentThreadId(threadId);
			window.history.pushState(null, "", `/chat/t/${threadId}`);
		}

		try {
			await streamChat({
				threadId: threadId,
				repos: effectiveRepo
					? [
							{
								owner: effectiveRepo.owner,
								repo: effectiveRepo.repo,
								filePath: effectiveRepo.filePath,
							},
						]
					: [],
				serverContext: effectiveServerContext,
				promptMessageId: messageId,
				modelId: model,
				userId: session?.data?.user?.id,
				userPlan: rateLimitStatus?.plan,
			});
		} catch (error) {
			console.error("streamChat error:", error);
		}
	};

	const handleCopyMessage = (threadId: string | null) => {
		trackEvent("Chat Copy Message Click", { threadId }, posthog);
	};

	const handleModelChange = (modelId: string, previousModelId: string) => {
		trackEvent("Chat Model Changed", { modelId, previousModelId }, posthog);
	};

	const isSubmitDisabled =
		!input.trim() ||
		rateLimitStatus?.remaining === 0 ||
		selectedModelRequiresSignIn ||
		serverNotIndexed;

	const reset = () => {
		setInput("");
		setSelectedRepo(initialRepo ?? null);
		setServerOverride(undefined);
		setModelOverride(null);
		setOptimisticUserMessage(null);
		setCurrentThreadId(undefined);
	};

	return {
		session,
		isAuthenticated,

		input,
		setInput,
		selectedRepo,
		setSelectedRepo,
		serverOverride,
		setServerOverride,
		modelOverride,
		setModelOverride,
		currentThreadId,
		optimisticUserMessage: effectiveOptimisticMessage,

		messages,
		threadMetadata,
		rateLimitStatus,

		effectiveRepo,
		effectiveServerContext,
		serverInviteUrl,
		discordInviteQuery,
		showDiscordCta,
		serverNotIndexed,

		model,
		selectedModelData,
		isAnonymous,
		selectedModelRequiresSignIn,
		agentStatus,
		agentError,
		isAgentWorking,

		title,
		placeholder,
		hasMessages,
		showEmptyState,
		isSubmitDisabled,

		handleSignIn,
		handleSubmit,
		handleCopyMessage,
		handleModelChange,
		reset,
	};
}
