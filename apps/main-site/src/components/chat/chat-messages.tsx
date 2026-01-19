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

export function ChatMessages({
	showWarningBanner,
}: {
	showWarningBanner: boolean;
}) {
	const chat = useChatContext();
	const lastMessage = chat.messages.at(-1);
	const lastMessageKey = lastMessage?.key;

	const lastMessageIsUser = lastMessage?.role === "user";
	const lastAssistantHasText =
		lastMessage?.role === "assistant" &&
		lastMessage.parts.some((p) => p.type === "text" && p.text.length > 0);

	const showOptimisticMessage =
		chat.optimisticUserMessage && chat.messages.length === 0;

	const showIndicator =
		chat.agentStatus === "thinking" ||
		chat.agentStatus === "cloning_repo" ||
		(chat.agentStatus === "responding" && !lastAssistantHasText) ||
		showOptimisticMessage ||
		lastMessageIsUser;

	return (
		<Conversation instance={chat.stickToBottom} className="h-full">
			<ConversationContent
				className={`max-w-4xl mx-auto w-full sm:px-6 pt-6 pb-16 ${showWarningBanner ? "lg:pb-40" : "lg:pb-32"}`}
			>
				{chat.messages.map((message) => (
					<MessageParts
						key={message.key}
						message={message}
						isLastMessage={message.key === lastMessageKey}
						threadId={chat.currentThreadId ?? null}
						onCopyMessage={chat.handleCopyMessage}
						agentStatus={chat.agentStatus}
					/>
				))}
				{showOptimisticMessage && chat.optimisticUserMessage && (
					<Message from="user">
						<MessageContent>
							<MessageResponse>{chat.optimisticUserMessage}</MessageResponse>
						</MessageContent>
					</Message>
				)}
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
			<ConversationScrollButton className="bottom-20 lg:bottom-36" />
		</Conversation>
	);
}
