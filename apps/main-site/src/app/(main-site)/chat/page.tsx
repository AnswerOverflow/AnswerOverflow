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
import { memo } from "react";
import { useCallback, useState } from "react";
import {
	isToolUIPart,
	getToolName,
	type ToolUIPart,
	type DynamicToolUIPart,
} from "ai";

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

export default function ChatPage() {
	const [threadId, setThreadId] = useState<string | null>(null);
	const [input, setInput] = useState("");

	const createThread = useMutation(api.chat.mutations.createChatThread);
	const sendMessage = useMutation(api.chat.mutations.sendMessage);

	const { results: messages, status } = useUIMessages(
		api.chat.mutations.listMessages,
		threadId ? { threadId } : "skip",
		{ initialNumItems: 50, stream: true },
	);

	const handleCreateThread = useCallback(async () => {
		const newThreadId = await createThread();
		setThreadId(newThreadId);
	}, [createThread]);

	const handleSubmit = useCallback(
		async (message: PromptInputMessage) => {
			if (!threadId) return;
			const text = message.text.trim();
			if (!text) return;

			setInput("");
			await sendMessage({ threadId, prompt: text });
		},
		[threadId, sendMessage],
	);

	if (!threadId) {
		return (
			<div className="flex h-screen flex-col items-center justify-center gap-6 p-6">
				<div className="flex flex-col items-center gap-4 text-center">
					<div className="flex size-16 items-center justify-center rounded-full bg-muted">
						<Bot className="size-8 text-muted-foreground" />
					</div>
					<div className="space-y-2">
						<h1 className="text-2xl font-semibold">Agent Chat</h1>
						<p className="text-muted-foreground">
							Test the Convex Agent with streaming, tool calls, and MCP
							integration.
						</p>
						<p className="text-sm text-muted-foreground">
							Try: "What time is it?" or "Roll 2d20"
						</p>
					</div>
					<Button onClick={handleCreateThread} size="lg">
						Start Chat
					</Button>
				</div>
			</div>
		);
	}

	const isLoading = status === "LoadingFirstPage";
	const hasMessages = messages.length > 0;
	const lastMessageId = messages.at(-1)?.id;

	return (
		<div className="mx-auto flex h-screen max-w-4xl flex-col p-6">
			<Conversation className="flex-1">
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

			<PromptInput onSubmit={handleSubmit} className="mt-4">
				<PromptInputTextarea
					value={input}
					onChange={(e) => setInput(e.target.value)}
					placeholder="Send a message..."
				/>
				<PromptInputFooter>
					<PromptInputTools />
					<PromptInputSubmit disabled={!input.trim()} />
				</PromptInputFooter>
			</PromptInput>
		</div>
	);
}
