"use client";

import type { UIMessage } from "@packages/agent/react";
import { useSmoothText } from "@packages/agent/react";
import {
	Message,
	MessageAction,
	MessageActions,
	MessageContent,
	MessageResponse,
} from "@packages/ui/components/ai-elements/message";
import { isToolUIPart } from "ai";
import { Copy as CopyIcon } from "lucide-react";
import { inlineCardComponents } from "./embeds";
import { ToolPartDisplay } from "./tool-displays";

export function SmoothMessageResponse({
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

	return (
		<MessageResponse components={inlineCardComponents}>
			{isStreaming ? smoothText : text}
		</MessageResponse>
	);
}

export function MessageParts({
	message,
	isLastMessage,
	threadId,
	onCopyMessage,
	agentStatus,
}: {
	message: UIMessage;
	isLastMessage: boolean;
	threadId: string | null;
	onCopyMessage: (threadId: string | null) => void;
	agentStatus?: string;
}) {
	const isStreaming =
		message.status === "streaming" ||
		(isLastMessage &&
			message.role === "assistant" &&
			agentStatus === "responding");

	return (
		<>
			{message.parts.map((part, i) => {
				const key = `${message.key}-${i}`;

				if (isToolUIPart(part)) {
					return <ToolPartDisplay key={key} part={part} />;
				}

				if (part.type === "text") {
					if (message.role === "user" && !part.text) {
						return null;
					}
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
