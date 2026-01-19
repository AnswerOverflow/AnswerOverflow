"use client";

import {
	Conversation,
	ConversationContent,
	ConversationScrollButton,
} from "@packages/ui/components/ai-elements/conversation";
import {
	Message,
	MessageContent,
	MessageResponse,
} from "@packages/ui/components/ai-elements/message";
import { AgentStatusIndicator } from "./chat-agent-status";
import { useChatContext } from "./chat-state-provider";
import { MessageParts } from "./message-parts";

export function ChatMessages() {
	const chat = useChatContext();
	const lastMessageId = chat.messages.at(-1)?.id;
	const lastMessage = chat.messages.at(-1);

	const hasAssistantMessageWithText = chat.messages.some(
		(m) =>
			m.role === "assistant" &&
			m.parts.some((p) => p.type === "text" && p.text.length > 0),
	);

	const waitingForResponse = !hasAssistantMessageWithText;

	const showIndicator =
		chat.agentStatus === "thinking" ||
		chat.agentStatus === "cloning_repo" ||
		(chat.agentStatus === "responding" && waitingForResponse) ||
		(chat.optimisticUserMessage && waitingForResponse);

	return (
		<Conversation instance={chat.stickToBottom} className="flex-1">
			<ConversationContent>
				{chat.optimisticUserMessage && chat.messages.length === 0 && (
					<Message from="user">
						<MessageContent>
							<MessageResponse>{chat.optimisticUserMessage}</MessageResponse>
						</MessageContent>
					</Message>
				)}
				{chat.messages.map((message) => (
					<MessageParts
						key={message.key}
						message={message}
						isLastMessage={message.id === lastMessageId}
						threadId={chat.currentThreadId ?? null}
						onCopyMessage={chat.handleCopyMessage}
					/>
				))}
				{showIndicator && (
					<AgentStatusIndicator
						status={chat.agentStatus === "idle" ? "thinking" : chat.agentStatus}
						error={chat.agentError}
						repoName={
							chat.effectiveRepo
								? `${chat.effectiveRepo.owner}/${chat.effectiveRepo.repo}`
								: null
						}
					/>
				)}
			</ConversationContent>
			<ConversationScrollButton />
		</Conversation>
	);
}
