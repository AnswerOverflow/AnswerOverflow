"use client";

import { createContext, useCallback, useContext, useState } from "react";

const MessageResultPageContext = createContext<{
	showAllMessages: boolean;
	setShowAllMessages: (showAllMessages: boolean) => void;
	scrollToMessage: (messageId: string) => boolean;
	currentPageUrl: string | null;
}>({
	showAllMessages: false,
	setShowAllMessages: () => {},
	scrollToMessage: () => false,
	currentPageUrl: null,
});

export const MessageResultPageProvider = (props: {
	children: React.ReactNode;
	currentPageUrl?: string;
}) => {
	const [showAllMessages, setShowAllMessages] = useState(false);

	const scrollToMessage = useCallback((messageId: string) => {
		const element =
			document.getElementById(`message-${messageId}`) ??
			document.getElementById(`solution-${messageId}`);
		if (element) {
			element.scrollIntoView({ behavior: "smooth", block: "center" });
			element.classList.add("bg-accent/50");
			setTimeout(() => {
				element.classList.remove("bg-accent/50");
			}, 2000);
			return true;
		}
		return false;
	}, []);

	return (
		<MessageResultPageContext.Provider
			value={{
				showAllMessages,
				setShowAllMessages,
				scrollToMessage,
				currentPageUrl: props.currentPageUrl ?? null,
			}}
		>
			{props.children}
		</MessageResultPageContext.Provider>
	);
};

export const useMessageResultPageContext = () => {
	return useContext(MessageResultPageContext);
};
