"use client";

import type { UIMessage } from "@packages/agent/react";
import {
	optimisticallySendMessage,
	useSmoothText,
	useUIMessages,
} from "@packages/agent/react";
import { api } from "@packages/database/convex/_generated/api";
import {
	defaultModelId,
	getModelById,
	models,
} from "@packages/database/models";
import { trackEvent, usePostHog } from "@packages/ui/analytics/client";
import {
	Conversation,
	ConversationContent,
	ConversationScrollButton,
} from "@packages/ui/components/ai-elements/conversation";
import {
	Message,
	MessageAction,
	MessageActions,
	MessageContent,
	MessageResponse,
} from "@packages/ui/components/ai-elements/message";
import {
	ModelSelectorLogo,
	ModelSelectorName,
} from "@packages/ui/components/ai-elements/model-selector";
import {
	PromptInput,
	PromptInputBody,
	PromptInputButton,
	PromptInputFooter,
	type PromptInputMessage,
	PromptInputSubmit,
	PromptInputTextarea,
	PromptInputTools,
} from "@packages/ui/components/ai-elements/prompt-input";
import {
	Tool,
	ToolContent,
	ToolHeader,
	ToolInput,
	ToolOutput,
} from "@packages/ui/components/ai-elements/tool";

import { Button } from "@packages/ui/components/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@packages/ui/components/command";

import {
	useAuthClient,
	useSession,
} from "@packages/ui/components/convex-client-provider";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@packages/ui/components/popover";
import { useIsNavbarHidden } from "@packages/ui/hooks/use-scroll-container";
import { useQuery } from "@tanstack/react-query";
import {
	type DynamicToolUIPart,
	getToolName,
	isToolUIPart,
	type ToolUIPart,
} from "ai";
import { useAction, useMutation } from "convex/react";
import {
	AlertCircle as AlertCircleIcon,
	CheckIcon,
	Copy as CopyIcon,
	Loader2,
	LockIcon,
	Menu,
	PlusIcon,
} from "lucide-react";
import Image from "next/image";
import { memo, useState } from "react";
import { useStickToBottom } from "use-stick-to-bottom";
import type { DiscordServerContext } from "@/lib/discord-server-types";
import { streamChat } from "@/lib/server/chat";
import { useAuthenticatedQuery } from "@/lib/use-authenticated-query";
import { useChatSidebar } from "./chat-sidebar";
import { DiscordInviteCTA } from "./discord-invite-cta";
import { DiscordServerSelector } from "./discord-server-selector";
import { GitHubRepoSelector } from "./github-repo-selector";

export type GitHubRepo = {
	owner: string;
	repo: string;
	filePath?: string;
};

function formatTimeUntilReset(resetsAt: number): string {
	const now = Date.now();
	const msRemaining = resetsAt - now;

	if (msRemaining <= 0) return "now";

	const minutes = Math.ceil(msRemaining / 60000);
	if (minutes < 60) {
		return `${minutes} minute${minutes === 1 ? "" : "s"}`;
	}

	const hours = Math.floor(minutes / 60);
	const remainingMinutes = minutes % 60;
	if (remainingMinutes === 0) {
		return `${hours} hour${hours === 1 ? "" : "s"}`;
	}
	return `${hours}h ${remainingMinutes}m`;
}

function RateLimitWarning({
	remaining,
	resetsAt,
	isAnonymous,
	onSignIn,
}: {
	remaining: number;
	resetsAt: number | null;
	isAnonymous: boolean;
	onSignIn: () => void;
}) {
	const message =
		remaining === 0
			? `Out of messages.${resetsAt ? ` Resets in ${formatTimeUntilReset(resetsAt)}.` : ""}`
			: `${remaining} message${remaining === 1 ? "" : "s"} remaining.${resetsAt ? ` Resets in ${formatTimeUntilReset(resetsAt)}.` : ""}`;

	return (
		<div className="flex items-center gap-2 rounded-t-md border-2 border-b-0 border-border bg-secondary px-3 py-1.5">
			<AlertCircleIcon className="size-3.5 shrink-0 text-muted-foreground" />
			<span className="flex-1 text-xs text-muted-foreground">{message}</span>
			{isAnonymous && (
				<Button
					size="sm"
					variant="ghost"
					className="h-6 shrink-0 px-2 text-xs"
					onClick={onSignIn}
				>
					Sign in for more
				</Button>
			)}
		</div>
	);
}

function SignInRequiredWarning({
	modelName,
	onSignIn,
}: {
	modelName: string;
	onSignIn: () => void;
}) {
	return (
		<div className="flex items-center gap-2 rounded-t-md border-2 border-b-0 border-border bg-secondary px-3 py-1.5">
			<LockIcon className="size-3.5 shrink-0 text-muted-foreground" />
			<span className="flex-1 text-xs text-muted-foreground">
				Sign in to use {modelName}
			</span>
			<Button
				size="sm"
				variant="ghost"
				className="h-6 shrink-0 px-2 text-xs"
				onClick={onSignIn}
			>
				Sign in
			</Button>
		</div>
	);
}

function ModelSelector({
	selectedModel,
	onSelectModel,
	onModelChange,
	compact = false,
}: {
	selectedModel: string;
	onSelectModel: (modelId: string) => void;
	onModelChange?: (modelId: string, previousModelId: string) => void;
	compact?: boolean;
}) {
	const [open, setOpen] = useState(false);
	const selectedModelData = models.find((m) => m.id === selectedModel);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<PromptInputButton size={compact ? "icon-sm" : undefined}>
					{selectedModelData?.chefSlug && (
						<ModelSelectorLogo provider={selectedModelData.chefSlug} />
					)}
					{!compact && selectedModelData?.name && (
						<ModelSelectorName>{selectedModelData.name}</ModelSelectorName>
					)}
				</PromptInputButton>
			</PopoverTrigger>
			<PopoverContent className="w-[300px] p-0" align="start">
				<Command>
					<CommandInput placeholder="Search models..." />
					<CommandList>
						<CommandEmpty>No models found.</CommandEmpty>
						{["ZAI", "MiniMax", "OpenAI", "Anthropic", "Google"].map((chef) => (
							<CommandGroup heading={chef} key={chef}>
								{models
									.filter((m) => m.chef === chef)
									.map((m) => (
										<CommandItem
											key={m.id}
											onSelect={() => {
												if (m.id !== selectedModel) {
													onModelChange?.(m.id, selectedModel);
												}
												onSelectModel(m.id);
												setOpen(false);
											}}
											value={m.id}
										>
											<ModelSelectorLogo provider={m.chefSlug} />
											<ModelSelectorName>{m.name}</ModelSelectorName>
											{selectedModel === m.id ? (
												<CheckIcon className="ml-auto size-4" />
											) : (
												<div className="ml-auto size-4" />
											)}
										</CommandItem>
									))}
							</CommandGroup>
						))}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

const SmoothMessageResponse = memo(function SmoothMessageResponse({
	text,
	isStreaming,
}: {
	text: string;
	isStreaming: boolean;
}) {
	const [smoothText] = useSmoothText(text, {
		startStreaming: isStreaming,
		charsPerSec: 500,
	});

	return <MessageResponse>{isStreaming ? smoothText : text}</MessageResponse>;
});

type AgentStatus =
	| "idle"
	| "cloning_repo"
	| "thinking"
	| "responding"
	| "error";

function AgentStatusIndicator({
	status,
	error,
	repoName,
}: {
	status: AgentStatus;
	error?: string | null;
	repoName?: string | null;
}) {
	if (status === "cloning_repo") {
		return (
			<Message from="assistant">
				<MessageContent>
					<span className="flex items-center gap-2 text-sm text-muted-foreground">
						<Loader2 className="size-3 animate-spin" />
						{repoName ? `Cloning ${repoName}...` : "Cloning repository..."}
					</span>
				</MessageContent>
			</Message>
		);
	}

	if (status === "error") {
		return (
			<Message from="assistant">
				<MessageContent>
					<span className="text-sm text-destructive">
						{error ?? "An error occurred"}
					</span>
				</MessageContent>
			</Message>
		);
	}

	return (
		<Message from="assistant">
			<MessageContent>
				<div className="flex items-center gap-1">
					<span className="animate-[pulse_1s_ease-in-out_infinite]">.</span>
					<span className="animate-[pulse_1s_ease-in-out_0.2s_infinite]">
						.
					</span>
					<span className="animate-[pulse_1s_ease-in-out_0.4s_infinite]">
						.
					</span>
				</div>
			</MessageContent>
		</Message>
	);
}

function ToolPart({ part }: { part: ToolUIPart | DynamicToolUIPart }) {
	return (
		<Tool>
			<ToolHeader
				title={getToolName(part)}
				type={part.type}
				state={part.state}
			/>
			<ToolContent>
				<ToolInput input={part.input} />
				<ToolOutput output={part.output} errorText={part.errorText} />
			</ToolContent>
		</Tool>
	);
}

function MessageParts({
	message,
	isLastMessage,
	threadId,
	onCopyMessage,
}: {
	message: UIMessage;
	isLastMessage: boolean;
	threadId: string | null;
	onCopyMessage: (threadId: string | null) => void;
}) {
	const isStreaming = message.status === "streaming";

	return (
		<>
			{message.parts.map((part, i) => {
				const key = `${message.id}-${i}`;

				if (isToolUIPart(part)) {
					return <ToolPart key={key} part={part} />;
				}

				if (part.type === "text") {
					return (
						<Message key={key} from={message.role}>
							<MessageContent>
								<SmoothMessageResponse
									text={part.text}
									isStreaming={isStreaming && isLastMessage}
								/>
							</MessageContent>
							{message.role === "assistant" &&
								isLastMessage &&
								!isStreaming && (
									<MessageActions>
										<MessageAction
											onClick={() => {
												navigator.clipboard.writeText(part.text);
												onCopyMessage(threadId);
											}}
											tooltip="Copy"
										>
											<CopyIcon className="size-3" />
										</MessageAction>
									</MessageActions>
								)}
						</Message>
					);
				}

				return null;
			})}
		</>
	);
}

type ChatInterfaceProps = {
	threadId?: string;
	initialRepo?: GitHubRepo;
};

export function ChatInterface({
	threadId: initialThreadId,
	initialRepo,
}: ChatInterfaceProps) {
	const session = useSession({ allowAnonymous: true });
	const isAuthenticated = !!session?.data;
	const { setMobileSidebarOpen, setStartNewChat } = useChatSidebar();
	const isNavbarHidden = useIsNavbarHidden();
	const authClient = useAuthClient();
	const posthog = usePostHog();

	const [input, setInput] = useState("");
	const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(
		initialRepo ?? null,
	);
	const [serverOverride, setServerOverride] = useState<
		DiscordServerContext | null | undefined
	>(undefined);
	const [modelOverride, setModelOverride] = useState<string | null>(null);
	const [optimisticUserMessage, setOptimisticUserMessage] = useState<
		string | null
	>(null);
	const [currentThreadId, setCurrentThreadId] = useState<string | undefined>(
		initialThreadId,
	);

	const stickToBottom = useStickToBottom({ initial: "instant" });

	const startNewChat = () => {
		setCurrentThreadId(undefined);
		setSelectedRepo(null);
		setServerOverride(null);
		setOptimisticUserMessage(null);
		setInput("");
		setModelOverride(null);
		window.history.pushState(null, "", "/chat");
	};

	setStartNewChat(startNewChat);

	const rateLimitStatus = useAuthenticatedQuery(
		api.chat.mutations.getChatRateLimitStatus,
		{},
		{ allowAnonymous: true },
	);

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
	const agentStatus = threadMetadata?.agentStatus ?? "idle";
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

	const hasMessages = messages.length > 0 || optimisticUserMessage;
	const showEmptyState = !currentThreadId && !hasMessages;

	const handleSubmit = async (message: PromptInputMessage) => {
		const text = message.text?.trim();
		if (!text) return;

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
		});
	};

	const lastMessageId = messages.at(-1)?.id;

	const handleCopyMessage = (threadId: string | null) => {
		trackEvent("Chat Copy Message Click", { threadId }, posthog);
	};

	const handleModelChange = (modelId: string, previousModelId: string) => {
		trackEvent("Chat Model Changed", { modelId, previousModelId }, posthog);
	};

	if (session.isPending) {
		return (
			<div
				className={`relative flex w-full flex-col items-center justify-center overflow-hidden ${isNavbarHidden ? "h-dvh" : "h-[calc(100dvh-var(--navbar-height))]"}`}
			>
				<Loader2 className="size-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<div
			className={`relative flex w-full flex-col overflow-hidden ${isNavbarHidden ? "h-dvh" : "h-[calc(100dvh-var(--navbar-height))]"}`}
		>
			<div className="lg:hidden flex items-center gap-2 px-4 py-2 border-b shrink-0">
				<Button
					variant="ghost"
					size="icon"
					onClick={() => setMobileSidebarOpen(true)}
				>
					<Menu className="size-5" />
				</Button>
				<span className="text-sm font-medium truncate flex-1">{title}</span>
				<Button variant="ghost" size="icon" onClick={startNewChat}>
					<PlusIcon className="size-5" />
				</Button>
			</div>

			<div ref={stickToBottom.scrollRef} className="flex-1 overflow-y-auto">
				<div
					className={`max-w-4xl mx-auto w-full flex flex-col min-h-full sm:px-6 pt-6 ${
						showDiscordCta || (rateLimitStatus && rateLimitStatus.remaining < 3)
							? "lg:pb-40"
							: "lg:pb-32"
					}`}
				>
					{showEmptyState ? (
						<div className="flex flex-1 flex-col items-center justify-center min-h-[50vh]">
							{effectiveRepo && (
								<div className="flex flex-col items-center gap-4 text-center">
									<Image
										src={`https://github.com/${effectiveRepo.owner}.png?size=128`}
										alt={effectiveRepo.owner}
										width={64}
										height={64}
										className="rounded-full"
										unoptimized
									/>
									<div className="space-y-2">
										<h1 className="text-2xl font-semibold">{title}</h1>
										<p className="text-muted-foreground">
											Ask questions about the {effectiveRepo.owner}/
											{effectiveRepo.repo} codebase
										</p>
									</div>
								</div>
							)}
						</div>
					) : (
						<Conversation instance={stickToBottom} className="flex-1">
							<ConversationContent>
								{optimisticUserMessage && messages.length === 0 && (
									<Message from="user">
										<MessageContent>
											<MessageResponse>{optimisticUserMessage}</MessageResponse>
										</MessageContent>
									</Message>
								)}
								{messages.map((message) => (
									<MessageParts
										key={message.key}
										message={message}
										isLastMessage={message.id === lastMessageId}
										threadId={currentThreadId ?? null}
										onCopyMessage={handleCopyMessage}
									/>
								))}
								{(isAgentWorking ||
									(optimisticUserMessage && messages.length === 0)) && (
									<AgentStatusIndicator
										status={agentStatus === "idle" ? "thinking" : agentStatus}
										error={agentError}
										repoName={
											effectiveRepo
												? `${effectiveRepo.owner}/${effectiveRepo.repo}`
												: null
										}
									/>
								)}
							</ConversationContent>
							<ConversationScrollButton />
						</Conversation>
					)}
					<div className="lg:hidden max-w-4xl mx-auto w-full px-2 sm:px-4">
						{serverNotIndexed && effectiveServerContext && (
							<DiscordInviteCTA
								variant="server"
								serverName={effectiveServerContext.name}
								discordInviteUrl={serverInviteUrl}
							/>
						)}
						{showDiscordCta && effectiveRepo && (
							<DiscordInviteCTA
								repoOwner={effectiveRepo.owner}
								repoName={effectiveRepo.repo}
								discordInviteCode={discordInviteQuery.data?.inviteCodes[0]}
							/>
						)}
						{selectedModelRequiresSignIn && !showDiscordCta && (
							<SignInRequiredWarning
								modelName={selectedModelData?.name ?? "this model"}
								onSignIn={handleSignIn}
							/>
						)}
						{rateLimitStatus &&
							rateLimitStatus.remaining < 3 &&
							!showDiscordCta &&
							!selectedModelRequiresSignIn && (
								<RateLimitWarning
									remaining={rateLimitStatus.remaining}
									resetsAt={rateLimitStatus.resetsAt}
									isAnonymous={rateLimitStatus.isAnonymous}
									onSignIn={handleSignIn}
								/>
							)}
						<PromptInput
							onSubmit={handleSubmit}
							attachedTop={
								serverNotIndexed ||
								showDiscordCta ||
								selectedModelRequiresSignIn ||
								(rateLimitStatus && rateLimitStatus.remaining < 3)
							}
						>
							<PromptInputBody>
								<PromptInputTextarea
									value={input}
									onChange={(e) => setInput(e.target.value)}
									placeholder={placeholder}
								/>
							</PromptInputBody>
							<PromptInputFooter>
								<PromptInputTools>
									<DiscordServerSelector
										selectedServer={effectiveServerContext}
										onSelectServer={setServerOverride}
										compact
									/>

									<GitHubRepoSelector
										selectedRepo={effectiveRepo}
										onSelectRepo={setSelectedRepo}
										compact
									/>
								</PromptInputTools>

								<PromptInputSubmit
									disabled={
										!input.trim() ||
										rateLimitStatus?.remaining === 0 ||
										selectedModelRequiresSignIn ||
										serverNotIndexed
									}
								>
									{selectedModelRequiresSignIn ? (
										<LockIcon className="size-4" />
									) : undefined}
								</PromptInputSubmit>
							</PromptInputFooter>
						</PromptInput>
					</div>
				</div>
			</div>

			<div className="hidden lg:block absolute bottom-0 left-0 right-0">
				<div className="max-w-4xl mx-auto w-full px-2 sm:px-4">
					{serverNotIndexed && effectiveServerContext && (
						<DiscordInviteCTA
							variant="server"
							serverName={effectiveServerContext.name}
							discordInviteUrl={serverInviteUrl}
						/>
					)}
					{showDiscordCta && effectiveRepo && (
						<DiscordInviteCTA
							repoOwner={effectiveRepo.owner}
							repoName={effectiveRepo.repo}
							discordInviteCode={discordInviteQuery.data?.inviteCodes[0]}
						/>
					)}
					{selectedModelRequiresSignIn && !showDiscordCta && (
						<SignInRequiredWarning
							modelName={selectedModelData?.name ?? "this model"}
							onSignIn={handleSignIn}
						/>
					)}
					{rateLimitStatus &&
						rateLimitStatus.remaining < 3 &&
						!showDiscordCta &&
						!selectedModelRequiresSignIn && (
							<RateLimitWarning
								remaining={rateLimitStatus.remaining}
								resetsAt={rateLimitStatus.resetsAt}
								isAnonymous={rateLimitStatus.isAnonymous}
								onSignIn={handleSignIn}
							/>
						)}
					<PromptInput
						onSubmit={handleSubmit}
						attachedTop={
							serverNotIndexed ||
							showDiscordCta ||
							selectedModelRequiresSignIn ||
							(rateLimitStatus && rateLimitStatus.remaining < 3)
						}
					>
						<PromptInputBody>
							<PromptInputTextarea
								value={input}
								onChange={(e) => setInput(e.target.value)}
								placeholder={placeholder}
							/>
						</PromptInputBody>
						<PromptInputFooter>
							<PromptInputTools>
								<DiscordServerSelector
									selectedServer={effectiveServerContext}
									onSelectServer={setServerOverride}
								/>

								<GitHubRepoSelector
									selectedRepo={effectiveRepo}
									onSelectRepo={setSelectedRepo}
								/>
							</PromptInputTools>

							<PromptInputSubmit
								disabled={
									!input.trim() ||
									rateLimitStatus?.remaining === 0 ||
									selectedModelRequiresSignIn ||
									serverNotIndexed
								}
							>
								{selectedModelRequiresSignIn ? (
									<LockIcon className="size-4" />
								) : undefined}
							</PromptInputSubmit>
						</PromptInputFooter>
					</PromptInput>
				</div>
			</div>
		</div>
	);
}
