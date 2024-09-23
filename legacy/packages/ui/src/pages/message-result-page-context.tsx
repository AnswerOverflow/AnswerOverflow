'use client';
import { createContext, useContext, useState } from 'react';

const MessageResultPageContext = createContext<{
	showAllMessages: boolean;
	setShowAllMessages: (showAllMessages: boolean) => void;
}>({
	showAllMessages: false,
	setShowAllMessages: () => {},
});

export const MessageResultPageProvider = (props: {
	children: React.ReactNode;
}) => {
	const [showAllMessages, setShowAllMessages] = useState(false);
	return (
		<MessageResultPageContext.Provider
			value={{ showAllMessages, setShowAllMessages }}
		>
			{props.children}
		</MessageResultPageContext.Provider>
	);
};
export const useMessageResultPageContext = () => {
	return useContext(MessageResultPageContext);
};
