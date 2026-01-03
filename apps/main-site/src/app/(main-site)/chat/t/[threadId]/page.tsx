"use client";

import { useParams } from "next/navigation";
import { ChatInterface } from "@/components/chat/chat-interface";

export default function ThreadPage() {
	const params = useParams<{ threadId: string }>();

	return <ChatInterface initialThreadId={params.threadId} />;
}
