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
import { useIsNavbarHidden } from "@packages/ui/hooks/use-scroll-container";
import {
	type DynamicToolUIPart,
	getToolName,
	isToolUIPart,
	type ToolUIPart,
} from "ai";
import { useMutation } from "convex/react";
import {
	CheckIcon,
	CopyIcon,
	Loader2,
	Menu,
	RefreshCcwIcon,
} from "lucide-react";
import Image from "next/image";

import { memo, useState } from "react";
import { useStickToBottom } from "use-stick-to-bottom";
import { useAuthenticatedQuery } from "@/lib/use-authenticated-query";
import { useChatSidebar } from "./chat-sidebar";
import { GitHubRepoSelector } from "./github-repo-selector";

export type GitHubRepo = {
	owner: string;
	repo: string;
	filePath?: string;
};

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
}: {
	message: UIMessage;
	isLastMessage: boolean;
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
											onClick={() => navigator.clipboard.writeText(part.text)}
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
	const session = useSession({ allowAnonymous: false });
	const isAuthenticated = !!session?.data;
	const { setMobileSidebarOpen } = useChatSidebar();
	const isNavbarHidden = useIsNavbarHidden();

	const [input, setInput] = useState("");
	const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(
		initialRepo ?? null,
	);
	const [modelOverride, setModelOverride] = useState<string | null>(null);
	const [optimisticUserMessage, setOptimisticUserMessage] = useState<
		string | null
	>(null);
	const [currentThreadId, setCurrentThreadId] = useState<string | undefined>(
		initialThreadId,
	);

	const stickToBottom = useStickToBottom({ initial: "instant" });

	const threadMetadata = useAuthenticatedQuery(
		api.chat.mutations.getChatThreadMetadata,
		currentThreadId ? { threadId: currentThreadId } : "skip",
	);

	const { results: messages } = useUIMessages(
		api.chat.mutations.listMessages,
		currentThreadId && isAuthenticated ? { threadId: currentThreadId } : "skip",
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
	const effectiveRepo =
		selectedRepo ??
		(repoFromThread
			? {
					owner: repoFromThread.owner,
					repo: repoFromThread.repo,
					filePath: repoFromThread.filePath ?? undefined,
				}
			: null);

	const model = modelOverride ?? threadMetadata?.modelId ?? defaultModelId;
	const agentStatus = threadMetadata?.agentStatus ?? "idle";
	const agentError = threadMetadata?.agentError ?? null;
	const isAgentWorking = agentStatus !== "idle" && agentStatus !== "error";

	const title =
		threadMetadata?.title ??
		(effectiveRepo
			? `Chat with ${effectiveRepo.owner}/${effectiveRepo.repo}`
			: null);
	const placeholder = effectiveRepo
		? `Ask about ${effectiveRepo.owner}/${effectiveRepo.repo}...`
		: "Send a message...";

	const hasMessages = messages.length > 0 || optimisticUserMessage;
	const showEmptyState = !currentThreadId && !hasMessages;

	const handleSubmit = async (message: PromptInputMessage) => {
		const text = message.text?.trim();
		if (!text) return;

		setInput("");

		if (!currentThreadId) {
			setOptimisticUserMessage(text);
		}

		const newThreadId = await sendMessage({
			threadId: currentThreadId,
			prompt: text,
			repoContext: effectiveRepo
				? {
						owner: effectiveRepo.owner,
						repo: effectiveRepo.repo,
						filePath: effectiveRepo.filePath,
					}
				: undefined,
			modelId: model,
		});

		if (!currentThreadId && newThreadId) {
			setCurrentThreadId(newThreadId);
			window.history.pushState(null, "", `/chat/t/${newThreadId}`);
		}
	};

	const lastMessageId = messages.at(-1)?.id;

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
				<span className="text-sm font-medium truncate">{title}</span>
			</div>

			<div ref={stickToBottom.scrollRef} className="flex-1 overflow-y-auto">
				<div className="max-w-4xl mx-auto w-full flex flex-col flex-1 sm:px-6 pt-6 pb-32">
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
						<Conversation instance={stickToBottom}>
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
				</div>
			</div>

			<div className="absolute bottom-0 left-0 right-0">
				<div className="max-w-4xl mx-auto w-full px-2 sm:px-4">
					<PromptInput onSubmit={handleSubmit}>
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
									selectedRepo={effectiveRepo}
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
	);
}
