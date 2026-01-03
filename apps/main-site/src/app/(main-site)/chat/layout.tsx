"use client";

import { ChatSidebar } from "@/components/chat/chat-sidebar";

export default function ChatLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <ChatSidebar>{children}</ChatSidebar>;
}
