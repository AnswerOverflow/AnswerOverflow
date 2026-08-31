"use client";

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
} from "react";
import { messageElementIds, messageIdFromHash } from "../utils/scroll-target";

const HIGHLIGHT_CLASS = "bg-accent/50";
const HIGHLIGHT_MS = 2000;

/**
 * Scrolls to a message that lives inside a virtualized list, where the element
 * is not in the DOM until the list has loaded and rendered it. Returns false
 * when the list cannot reach the message.
 */
export type MessageScroller = (messageId: string) => boolean;

export function findMessageElement(messageId: string): HTMLElement | null {
	for (const id of messageElementIds(messageId)) {
		const element = document.getElementById(id);
		if (element) {
			return element;
		}
	}
	return null;
}

export function highlightMessage(messageId: string): boolean {
	const element = findMessageElement(messageId);
	if (!element) {
		return false;
	}
	element.classList.add(HIGHLIGHT_CLASS);
	setTimeout(() => {
		element.classList.remove(HIGHLIGHT_CLASS);
	}, HIGHLIGHT_MS);
	return true;
}

const MessageResultPageContext = createContext<{
	scrollToMessage: (messageId: string) => boolean;
	registerMessageScroller: (scroller: MessageScroller) => () => void;
	currentPageUrl: string | null;
}>({
	scrollToMessage: () => false,
	registerMessageScroller: () => () => {},
	currentPageUrl: null,
});

export const MessageResultPageProvider = (props: {
	children: React.ReactNode;
	currentPageUrl?: string;
	/** Message to scroll to on load, e.g. from the `?focus=` search param. */
	focusMessageId?: string | null;
}) => {
	const scrollerRef = useRef<MessageScroller | null>(null);
	const pendingMessageIdRef = useRef<string | null>(null);

	const scrollToMessage = useCallback((messageId: string) => {
		const element = findMessageElement(messageId);
		if (element) {
			element.scrollIntoView({ behavior: "smooth", block: "center" });
			highlightMessage(messageId);
			return true;
		}
		const scroller = scrollerRef.current;
		if (scroller) {
			return scroller(messageId);
		}
		// The replies list has not mounted yet, retry once it registers itself.
		pendingMessageIdRef.current = messageId;
		return false;
	}, []);

	const registerMessageScroller = useCallback((scroller: MessageScroller) => {
		scrollerRef.current = scroller;
		const pending = pendingMessageIdRef.current;
		if (pending !== null) {
			pendingMessageIdRef.current = null;
			scroller(pending);
		}
		return () => {
			if (scrollerRef.current === scroller) {
				scrollerRef.current = null;
			}
		};
	}, []);

	const focusMessageId = props.focusMessageId ?? null;
	useEffect(() => {
		const target = focusMessageId ?? messageIdFromHash(window.location.hash);
		if (target) {
			scrollToMessage(target);
		}
	}, [focusMessageId, scrollToMessage]);

	return (
		<MessageResultPageContext.Provider
			value={{
				scrollToMessage,
				registerMessageScroller,
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
