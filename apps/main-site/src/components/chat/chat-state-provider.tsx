"use client";

import { createContext, useContext } from "react";
import type { StickToBottomInstance } from "use-stick-to-bottom";
import { type UseChatStateProps, useChatState } from "./hooks/use-chat-state";

export type ChatContextValue = ReturnType<typeof useChatState> & {
	stickToBottom: StickToBottomInstance;
};

const ChatStateContext = createContext<ChatContextValue | null>(null);

export function ChatStateProvider({
	children,
	stickToBottom,
	...props
}: UseChatStateProps & {
	children: React.ReactNode;
	stickToBottom: StickToBottomInstance;
}) {
	const chatState = useChatState(props);

	return (
		<ChatStateContext.Provider value={{ ...chatState, stickToBottom }}>
			{children}
		</ChatStateContext.Provider>
	);
}

export function useChatContext() {
	const context = useContext(ChatStateContext);
	if (!context) {
		throw new Error("useChatContext must be used within ChatStateProvider");
	}
	return context;
}
