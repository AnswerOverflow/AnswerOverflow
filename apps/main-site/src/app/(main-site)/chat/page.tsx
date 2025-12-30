"use client";

import { useUIMessages, useSmoothText } from "@packages/agent/react";
import type { UIMessage } from "@packages/agent/react";
import { Button } from "@packages/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@packages/ui/components/card";
import { Input } from "@packages/ui/components/input";
import { api } from "@packages/database/convex/_generated/api";
import { useMutation } from "convex/react";
import { Loader2, Send, Bot, User, Wrench } from "lucide-react";
import { useCallback, useState, useRef, useEffect } from "react";

function MessageContent({ message }: { message: UIMessage }) {
	const isStreaming = message.status === "streaming";
	const [smoothText] = useSmoothText(message.text ?? "", {
		startStreaming: isStreaming,
	});

	const displayText = isStreaming ? smoothText : (message.text ?? "");

	return (
		<div className="whitespace-pre-wrap">
			{displayText}
			{isStreaming && <span className="animate-pulse">▊</span>}
		</div>
	);
}

function ToolParts({ parts }: { parts: UIMessage["parts"] }) {
	const toolParts = parts.filter(
		(part) => part.type === "tool-call" || part.type === "tool-result",
	);

	if (toolParts.length === 0) return null;

	return (
		<div className="mt-2 space-y-1">
			{toolParts.map((part, i) => {
				if (part.type === "tool-call" && "toolName" in part) {
					const toolName = String(part.toolName);
					return (
						<div key={i} className="flex items-center gap-2 text-xs opacity-70">
							<Wrench className="h-3 w-3" />
							<span>Calling: {toolName}</span>
						</div>
					);
				}
				if (part.type === "tool-result" && "result" in part) {
					const result = part.result;
					const displayResult =
						typeof result === "string" ? result : JSON.stringify(result);
					return (
						<div
							key={i}
							className="rounded bg-background/50 p-2 text-xs font-mono"
						>
							{displayResult}
						</div>
					);
				}
				return null;
			})}
		</div>
	);
}

function Message({ message }: { message: UIMessage }) {
	const isUser = message.role === "user";

	return (
		<div
			className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} mb-4`}
		>
			<div
				className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
					isUser ? "bg-primary text-primary-foreground" : "bg-muted"
				}`}
			>
				{isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
			</div>
			<div
				className={`max-w-[80%] rounded-lg px-4 py-2 ${
					isUser ? "bg-primary text-primary-foreground" : "bg-muted"
				}`}
			>
				<MessageContent message={message} />
				<ToolParts parts={message.parts} />
			</div>
		</div>
	);
}

export default function ChatPage() {
	const [threadId, setThreadId] = useState<string | null>(null);
	const [input, setInput] = useState("");
	const [isCreatingThread, setIsCreatingThread] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const createThread = useMutation(api.chat.mutations.createChatThread);
	const sendMessage = useMutation(api.chat.mutations.sendMessage);

	const { results: messages, status } = useUIMessages(
		api.chat.mutations.listMessages,
		threadId ? { threadId } : "skip",
		{ initialNumItems: 50, stream: true },
	);

	const scrollToBottom = useCallback(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

	useEffect(() => {
		scrollToBottom();
	}, [messages, scrollToBottom]);

	const handleCreateThread = useCallback(async () => {
		setIsCreatingThread(true);
		try {
			const newThreadId = await createThread();
			setThreadId(newThreadId);
		} finally {
			setIsCreatingThread(false);
		}
	}, [createThread]);

	const handleSendMessage = useCallback(async () => {
		if (!threadId || !input.trim()) return;

		const messageText = input.trim();
		setInput("");

		await sendMessage({ threadId, prompt: messageText });
	}, [threadId, input, sendMessage]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				handleSendMessage();
			}
		},
		[handleSendMessage],
	);

	if (!threadId) {
		return (
			<div className="container mx-auto flex min-h-[calc(100vh-200px)] max-w-4xl items-center justify-center p-4">
				<Card className="w-full max-w-md">
					<CardHeader>
						<CardTitle className="text-center">Agent Chat MVP</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col items-center gap-4">
						<p className="text-center text-muted-foreground">
							Test the Convex Agent implementation with streaming, tool calls,
							and follow-up messages.
						</p>
						<p className="text-center text-sm text-muted-foreground">
							Available tools: <code>getCurrentTime</code>,{" "}
							<code>rollDice</code>
						</p>
						<Button
							onClick={handleCreateThread}
							disabled={isCreatingThread}
							size="lg"
						>
							{isCreatingThread ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Creating...
								</>
							) : (
								"Start Chat"
							)}
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="container mx-auto flex h-[calc(100vh-200px)] max-w-4xl flex-col p-4">
			<Card className="flex flex-1 flex-col overflow-hidden">
				<CardHeader className="border-b">
					<CardTitle className="flex items-center gap-2">
						<Bot className="h-5 w-5" />
						Agent Chat
						<span className="ml-auto text-xs font-normal text-muted-foreground">
							Thread: {threadId.slice(0, 8)}...
						</span>
					</CardTitle>
				</CardHeader>
				<CardContent className="flex-1 overflow-y-auto p-4">
					{status === "LoadingFirstPage" ? (
						<div className="flex h-full items-center justify-center">
							<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
						</div>
					) : messages.length === 0 ? (
						<div className="flex h-full flex-col items-center justify-center text-muted-foreground">
							<Bot className="mb-4 h-12 w-12 opacity-50" />
							<p>Send a message to start chatting!</p>
							<p className="mt-2 text-sm">
								Try asking: "What time is it?" or "Roll 2d20"
							</p>
						</div>
					) : (
						<div className="space-y-2">
							{messages.map((message) => (
								<Message key={message.key} message={message} />
							))}
							<div ref={messagesEndRef} />
						</div>
					)}
				</CardContent>
				<div className="border-t p-4">
					<div className="flex gap-2">
						<Input
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder="Type a message..."
							className="flex-1"
						/>
						<Button
							onClick={handleSendMessage}
							disabled={!input.trim()}
							size="icon"
						>
							<Send className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</Card>
		</div>
	);
}
