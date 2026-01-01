"use client";

import { useUIMessages, useSmoothText } from "@packages/agent/react";
import type { UIMessage } from "@packages/agent/react";
import { Button } from "@packages/ui/components/button";
import {
	Conversation,
	ConversationContent,
	ConversationScrollButton,
} from "@packages/ui/components/ai-elements/conversation";
import {
	Message,
	MessageContent,
	MessageResponse,
	MessageActions,
	MessageAction,
} from "@packages/ui/components/ai-elements/message";
import {
	PromptInput,
	PromptInputTextarea,
	PromptInputSubmit,
	PromptInputFooter,
	PromptInputTools,
	PromptInputBody,
	type PromptInputMessage,
} from "@packages/ui/components/ai-elements/prompt-input";
import {
	Tool,
	ToolHeader,
	ToolContent,
	ToolInput,
	ToolOutput,
} from "@packages/ui/components/ai-elements/tool";
import { Loader } from "@packages/ui/components/ai-elements/loader";
import { api } from "@packages/database/convex/_generated/api";
import { useMutation } from "convex/react";
import { Bot, CopyIcon, RefreshCcwIcon } from "lucide-react";
import { memo, useRef } from "react";
import { useCallback, useState } from "react";
import {
	isToolUIPart,
	getToolName,
	type ToolUIPart,
	type DynamicToolUIPart,
} from "ai";
import { useStickToBottom } from "use-stick-to-bottom";
import { RepoDisplay } from "./repo-display";

export type GitHubRepoContext = {
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
	repoContext?: GitHubRepoContext;
};

export function ChatInterface({ repoContext }: ChatInterfaceProps) {
	const [threadId, setThreadId] = useState<string | null>(null);
	const [input, setInput] = useState("");
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const stickToBottomInstance = useStickToBottom({
		initial: "instant",
		resize: "instant",
	});

	const setScrollRef = (element: HTMLDivElement | null) => {
		scrollContainerRef.current = element;
		if (element && stickToBottomInstance.scrollRef) {
			stickToBottomInstance.scrollRef(element);
		}
	};

	const createThread = useMutation(api.chat.mutations.createChatThread);
	const sendMessage = useMutation(api.chat.mutations.sendMessage);

	const { results: messages, status } = useUIMessages(
		api.chat.mutations.listMessages,
		threadId ? { threadId } : "skip",
		{ initialNumItems: 50, stream: true },
	);

	const handleCreateThread = useCallback(async () => {
		const newThreadId = await createThread({
			repoContext: repoContext
				? {
						owner: repoContext.owner,
						repo: repoContext.repo,
						filePath: repoContext.filePath,
					}
				: undefined,
		});
		setThreadId(newThreadId);
	}, [createThread, repoContext]);

	const handleSubmit = useCallback(
		async (message: PromptInputMessage) => {
			if (!threadId) return;
			const text = message.text?.trim();
			if (!text) return;

			setInput("");
			await sendMessage({ threadId, prompt: text });
		},
		[threadId, sendMessage],
	);

	const isLoading = status === "LoadingFirstPage";
	const hasMessages = messages.length > 0;
	const lastMessageId = messages.at(-1)?.id;

	const title = repoContext
		? `Chat with ${repoContext.owner}/${repoContext.repo}`
		: "Agent Chat";

	const description = repoContext
		? `Ask questions about the ${repoContext.owner}/${repoContext.repo} codebase`
		: "Test the Convex Agent with streaming, tool calls, and MCP integration.";

	const placeholder = repoContext
		? `Ask about ${repoContext.owner}/${repoContext.repo}...`
		: "Send a message...";

	return (
		<div className="relative flex h-[calc(100dvh-4rem)] w-full flex-col overflow-hidden">
			<div
				ref={setScrollRef}
				className="relative flex flex-1 w-full flex-col overflow-y-auto overflow-x-hidden min-h-0"
			>
				{!threadId ? (
					<div className="max-w-4xl mx-auto w-full flex flex-col flex-1 px-4 sm:px-6 pt-12 pb-4">
						<div className="flex flex-1 flex-col items-center justify-center gap-6">
							<div className="flex flex-col items-center gap-4 text-center">
								<div className="flex size-16 items-center justify-center rounded-full bg-muted">
									<Bot className="size-8 text-muted-foreground" />
								</div>
								<div className="space-y-2">
									<h1 className="text-2xl font-semibold">{title}</h1>
									<p className="text-muted-foreground">{description}</p>
									{!repoContext && (
										<p className="text-sm text-muted-foreground">
											Try: "What time is it?" or "Roll 2d20"
										</p>
									)}
								</div>
								<Button onClick={handleCreateThread} size="lg">
									Start Chat
								</Button>
							</div>
						</div>
					</div>
				) : (
					<div className="max-w-4xl mx-auto w-full flex flex-col flex-1 px-4 sm:px-6 pt-6 pb-4">
						<Conversation instance={stickToBottomInstance}>
							<ConversationContent>
								{isLoading ? (
									<div className="flex h-full items-center justify-center">
										<Loader size={32} />
									</div>
								) : !hasMessages ? (
									<div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
										<Bot className="size-12 opacity-50" />
										<p>Send a message to start chatting!</p>
									</div>
								) : (
									messages.map((message) => (
										<MessageParts
											key={message.key}
											message={message}
											isLastMessage={message.id === lastMessageId}
										/>
									))
								)}
							</ConversationContent>
							<ConversationScrollButton />
						</Conversation>
					</div>
				)}
			</div>

			<div className="sticky bottom-0 z-10 bg-background border-t">
				<div className="grid shrink-0 gap-2 sm:gap-4 pt-2 sm:pt-4 pb-14 sm:pb-16">
					<div className="w-full px-2 sm:px-4 max-w-4xl mx-auto">
						<PromptInput onSubmit={handleSubmit}>
							<PromptInputBody>
								{repoContext && <RepoDisplay repoContext={repoContext} />}
								<PromptInputTextarea
									value={input}
									onChange={(e) => setInput(e.target.value)}
									placeholder={placeholder}
								/>
							</PromptInputBody>
							<PromptInputFooter>
								<PromptInputTools />
								<PromptInputSubmit disabled={!input.trim()} />
							</PromptInputFooter>
						</PromptInput>
					</div>
				</div>
			</div>
		</div>
	);
}
