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
import {
	Tool,
	ToolContent,
	ToolHeader,
	ToolInput,
	ToolOutput,
} from "@packages/ui/components/ai-elements/tool";
import {
	type DynamicToolUIPart,
	getToolName,
	isToolUIPart,
	type ToolUIPart,
} from "ai";
import { Copy as CopyIcon } from "lucide-react";

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

	return <MessageResponse>{isStreaming ? smoothText : text}</MessageResponse>;
}

export function ToolPart({ part }: { part: ToolUIPart | DynamicToolUIPart }) {
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
				// Use message.key (stable across optimistic -> real transition) instead of message.id
				const key = `${message.key}-${i}`;

				if (isToolUIPart(part)) {
					return <ToolPart key={key} part={part} />;
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
