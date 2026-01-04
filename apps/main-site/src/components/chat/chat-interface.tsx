"use client";

import type { UIMessage } from "@packages/agent/react";
import {
	optimisticallySendMessage,
	useSmoothText,
	useUIMessages,
} from "@packages/agent/react";
import { api } from "@packages/database/convex/_generated/api";
import { defaultModelId, models } from "@packages/database/models";
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
	ModelSelectorLogoGroup,
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
import { useSession } from "@packages/ui/components/convex-client-provider";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@packages/ui/components/popover";
import {
	useIsNavbarHidden,
	useScrollContainer,
} from "@packages/ui/hooks/use-scroll-container";
import {
	type DynamicToolUIPart,
	getToolName,
	isToolUIPart,
	type ToolUIPart,
} from "ai";
import { useAction, useMutation } from "convex/react";
import { Bot, CheckIcon, CopyIcon, Menu, RefreshCcwIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useStickToBottom } from "use-stick-to-bottom";
import { useAuthenticatedQuery } from "@/lib/use-authenticated-query";
import { useChatSidebar } from "./chat-sidebar";
import { DiscordInviteCTA } from "./discord-invite-cta";
import { GitHubRepoSelector } from "./github-repo-selector";

function ModelSelector({
	selectedModel,
	onSelectModel,
}: {
	selectedModel: string;
	onSelectModel: (modelId: string) => void;
}) {
	const [open, setOpen] = useState(false);
	const selectedModelData = models.find((m) => m.id === selectedModel);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<PromptInputButton>
					{selectedModelData?.chefSlug && (
						<ModelSelectorLogo provider={selectedModelData.chefSlug} />
					)}
					{selectedModelData?.name && (
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
												onSelectModel(m.id);
												setOpen(false);
											}}
											value={m.id}
										>
											<ModelSelectorLogo provider={m.chefSlug} />
											<ModelSelectorName>{m.name}</ModelSelectorName>
											{/* SHowing providers isn't relevant to user */}
											{/* <Mod{" "}
								elSelectorLogoGroup>
												{m.providers.map((provider) => (
													<ModelSelectorLogo
														key={provider}
														provider={provider}
													/>
												))}
											</ModelSelectorLogoGroup> */}
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

export type GitHubRepo = {
	owner: string;
	repo: string;
	filePath?: string;
};

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

	const displayText = isStreaming ? smoothText : text;

	return <MessageResponse>{displayText}</MessageResponse>;
});

type AgentStatus =
	| "idle"
	| "cloning_repo"
	| "thinking"
	| "responding"
	| "error";

function ThinkingIndicator() {
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
					<span className="text-sm text-muted-foreground">
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

	return <ThinkingIndicator />;
}

function ToolPart({ part }: { part: ToolUIPart | DynamicToolUIPart }) {
	const toolName = getToolName(part);

	return (
		<Tool>
			<ToolHeader title={toolName} type={part.type} state={part.state} />
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
	onRegenerate,
}: {
	message: UIMessage;
	isLastMessage: boolean;
	onRegenerate?: () => void;
}) {
	const isStreaming = message.status === "streaming";

	return (
		<>
			{message.parts.map((part, i) => {
				const key = `${message.id}-${i}`;

				if (isToolUIPart(part)) {
					return <ToolPart key={key} part={part} />;
				}

				switch (part.type) {
					case "text":
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
											{onRegenerate && (
												<MessageAction onClick={onRegenerate} tooltip="Retry">
													<RefreshCcwIcon className="size-3" />
												</MessageAction>
											)}
											<MessageAction
												onClick={() => navigator.clipboard.writeText(part.text)}
												tooltip="Copy"
											>
												<CopyIcon className="size-3" />
											</MessageAction>
										</MessageActions>
									)}
							</Message>
						);
					case "reasoning":
						return null;
					default:
						return null;
				}
			})}
		</>
	);
}

type ChatInterfaceProps = {
	repos?: GitHubRepo[];
	initialThreadId?: string;
};

export function ChatInterface({
	repos = [],
	initialThreadId,
}: ChatInterfaceProps) {
	const router = useRouter();
	const session = useSession({ allowAnonymous: false });
	const isAuthenticated = !!session?.data;
	const { setMobileSidebarOpen } = useChatSidebar();
	const { setScrollContainer: setNavbarScrollContainer } = useScrollContainer();
	const isNavbarHidden = useIsNavbarHidden();
	const initialRepo = repos[0] ?? null;
	const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(
		initialRepo,
	);
	const [threadId, setThreadId] = useState<string | null>(
		initialThreadId ?? null,
	);
	const [input, setInput] = useState("");
	const [modelOverride, setModelOverride] = useState<string | null>(null);
	const [isInputVisible, setIsInputVisible] = useState(true);
	const [isNearBottom, setIsNearBottom] = useState(true);
	const lastScrollTopRef = useRef(0);
	const [scrollContainer, setScrollContainer] = useState<HTMLDivElement | null>(
		null,
	);
	const stickToBottomInstance = useStickToBottom({
		initial: "instant",
	});

	useEffect(() => {
		if (!scrollContainer) return;

		const handleScroll = () => {
			const currentScrollTop = scrollContainer.scrollTop;
			const maxScrollTop =
				scrollContainer.scrollHeight - scrollContainer.clientHeight;
			const nearBottom = currentScrollTop >= maxScrollTop - 400;

			setIsNearBottom(nearBottom);

			if (nearBottom) {
				setIsInputVisible(true);
			} else if (currentScrollTop > lastScrollTopRef.current) {
				setIsInputVisible(false);
			} else if (currentScrollTop < lastScrollTopRef.current) {
				setIsInputVisible(true);
			}

			lastScrollTopRef.current = currentScrollTop;
		};

		handleScroll();

		scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
		return () => scrollContainer.removeEventListener("scroll", handleScroll);
	}, [scrollContainer]);

	const threadMetadata = useAuthenticatedQuery(
		api.chat.mutations.getChatThreadMetadata,
		initialThreadId ? { threadId: initialThreadId } : "skip",
	);

	const getDiscordInviteInfo = useAction(
		api.public.github.getDiscordInviteInfo,
	);
	const discordInviteQuery = useQuery({
		queryKey: ["discord-invite-info", selectedRepo?.owner, selectedRepo?.repo],
		queryFn: async () => {
			if (!selectedRepo) return null;
			return getDiscordInviteInfo({
				owner: selectedRepo.owner,
				repo: selectedRepo.repo,
			});
		},
		enabled: !!selectedRepo,
		staleTime: 1000 * 60 * 60,
	});

	const model = modelOverride ?? threadMetadata?.modelId ?? defaultModelId;

	const setScrollRef = (element: HTMLDivElement | null) => {
		setScrollContainer(element);
		setNavbarScrollContainer(element);
		if (element && stickToBottomInstance.scrollRef) {
			stickToBottomInstance.scrollRef(element);
		}
	};

	const sendMessageMutation = useMutation(
		api.chat.mutations.sendMessage,
	).withOptimisticUpdate((store, args) => {
		if (args.threadId) {
			optimisticallySendMessage(api.chat.mutations.listMessages)(store, {
				threadId: args.threadId,
				prompt: args.prompt,
			});
		}
	});

	const { results: messages } = useUIMessages(
		api.chat.mutations.listMessages,
		threadId && isAuthenticated ? { threadId } : "skip",
		{ initialNumItems: 50, stream: true },
	);

	const handleSubmit = useCallback(
		async (message: PromptInputMessage) => {
			const text = message.text?.trim();
			if (!text) return;

			setInput("");

			const returnedThreadId = await sendMessageMutation({
				threadId: threadId ?? undefined,
				prompt: text,
				repoContext: selectedRepo
					? {
							owner: selectedRepo.owner,
							repo: selectedRepo.repo,
							filePath: selectedRepo.filePath,
						}
					: undefined,
				modelId: model,
			});

			if (!threadId) {
				setThreadId(returnedThreadId);
				router.push(`/chat/t/${returnedThreadId}`);
			}
		},
		[threadId, selectedRepo, sendMessageMutation, model, router],
	);

	const lastMessage = messages.at(-1);
	const lastMessageId = lastMessage?.id;
	const agentStatus = threadMetadata?.agentStatus ?? "idle";
	const agentError = threadMetadata?.agentError ?? null;
	const isAgentWorking = agentStatus !== "idle" && agentStatus !== "error";
	const repoName = threadMetadata?.repos?.[0]
		? `${threadMetadata.repos[0].owner}/${threadMetadata.repos[0].repo}`
		: null;

	const title = threadMetadata?.title
		? threadMetadata.title
		: selectedRepo
			? `Chat with ${selectedRepo.owner}/${selectedRepo.repo}`
			: "Agent Chat";

	const description = selectedRepo
		? `Ask questions about the ${selectedRepo.owner}/${selectedRepo.repo} codebase`
		: "Test the Convex Agent with streaming, tool calls, and MCP integration.";

	const placeholder = selectedRepo
		? `Ask about ${selectedRepo.owner}/${selectedRepo.repo}...`
		: "Send a message...";

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
					<span className="sr-only">Open sidebar</span>
				</Button>
				<span className="text-sm font-medium truncate">{title}</span>
			</div>
			<div
				ref={setScrollRef}
				className="relative flex flex-1 w-full flex-col overflow-y-auto overflow-x-hidden min-h-0"
			>
				<div
					className={`max-w-4xl mx-auto w-full flex flex-col flex-1 sm:px-6 pt-6 lg:pb-32 ${isNearBottom ? "" : "pb-32"}`}
				>
					{!threadId ? (
						<div className="flex flex-1 flex-col items-center justify-center gap-6">
							<div className="flex flex-col items-center gap-4 text-center">
								{selectedRepo ? (
									<Image
										src={`https://github.com/${selectedRepo.owner}.png?size=128`}
										alt={selectedRepo.owner}
										width={64}
										height={64}
										className="rounded-full"
										unoptimized
									/>
								) : (
									<div className="flex size-16 items-center justify-center rounded-full bg-muted">
										<Bot className="size-8 text-muted-foreground" />
									</div>
								)}
								<div className="space-y-2">
									<h1 className="text-2xl font-semibold">{title}</h1>
									<p className="text-muted-foreground">{description}</p>
									{!selectedRepo && (
										<p className="text-sm text-muted-foreground">
											Try: "What time is it?" or "Roll 2d20"
										</p>
									)}
								</div>
							</div>
						</div>
					) : (
						<Conversation instance={stickToBottomInstance}>
							<ConversationContent>
								{messages.map((message) => (
									<MessageParts
										key={message.key}
										message={message}
										isLastMessage={message.id === lastMessageId}
									/>
								))}
								{isAgentWorking && (
									<AgentStatusIndicator
										status={agentStatus}
										error={agentError}
										repoName={repoName}
									/>
								)}
								{agentStatus === "error" && (
									<AgentStatusIndicator status="error" error={agentError} />
								)}
							</ConversationContent>
							<ConversationScrollButton />
						</Conversation>
					)}
				</div>
				{isNearBottom && (
					<div className="w-full max-w-4xl mx-auto px-2 sm:px-6 lg:hidden">
						{selectedRepo &&
							discordInviteQuery.data?.hasDiscordInvite &&
							!discordInviteQuery.data.isOnAnswerOverflow && (
								<DiscordInviteCTA
									repoOwner={selectedRepo.owner}
									repoName={selectedRepo.repo}
									discordInviteCode={discordInviteQuery.data.inviteCodes[0]}
								/>
							)}
						<PromptInput
							onSubmit={handleSubmit}
							className={`[&_[data-slot=input-group]]:border-2 ${
								selectedRepo &&
								discordInviteQuery.data?.hasDiscordInvite &&
								!discordInviteQuery.data.isOnAnswerOverflow
									? "[&_[data-slot=input-group]]:rounded-t-none"
									: ""
							}`}
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
									<GitHubRepoSelector
										selectedRepo={selectedRepo}
										onSelectRepo={setSelectedRepo}
									/>
									<ModelSelector
										selectedModel={model}
										onSelectModel={setModelOverride}
									/>
								</PromptInputTools>
								<PromptInputSubmit disabled={!input.trim()} />
							</PromptInputFooter>
						</PromptInput>
					</div>
				)}
			</div>

			<div
				className={`absolute bottom-0 left-0 right-0 w-full rounded-b-none z-10 transition-transform duration-500 lg:translate-y-0 ${
					isNearBottom || !isInputVisible ? "translate-y-full" : "translate-y-0"
				}`}
			>
				<div className="grid shrink-0 gap-2">
					<div className="w-full max-w-4xl mx-auto px-2 sm:px-4">
						{selectedRepo &&
							discordInviteQuery.data?.hasDiscordInvite &&
							!discordInviteQuery.data.isOnAnswerOverflow && (
								<DiscordInviteCTA
									repoOwner={selectedRepo.owner}
									repoName={selectedRepo.repo}
									discordInviteCode={discordInviteQuery.data.inviteCodes[0]}
								/>
							)}
						<PromptInput
							onSubmit={handleSubmit}
							className={`[&_[data-slot=input-group]]:border-2 ${
								selectedRepo &&
								discordInviteQuery.data?.hasDiscordInvite &&
								!discordInviteQuery.data.isOnAnswerOverflow
									? "[&_[data-slot=input-group]]:rounded-t-none"
									: ""
							}`}
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
									<GitHubRepoSelector
										selectedRepo={selectedRepo}
										onSelectRepo={setSelectedRepo}
									/>
									<ModelSelector
										selectedModel={model}
										onSelectModel={setModelOverride}
									/>
								</PromptInputTools>
								<PromptInputSubmit disabled={!input.trim()} />
							</PromptInputFooter>
						</PromptInput>
					</div>
				</div>
			</div>
		</div>
	);
}
