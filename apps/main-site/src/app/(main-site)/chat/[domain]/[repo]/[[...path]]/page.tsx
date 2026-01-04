"use client";

import { useParams } from "next/navigation";
import { ChatInterface } from "@/components/chat/chat-interface";

export default function RepoChatPage() {
	const params = useParams<{
		domain: string;
		repo: string;
		path?: string[];
	}>();

	return (
		<ChatInterface
			initialRepo={{
				owner: params.domain,
				repo: params.repo,
				filePath: params.path?.join("/"),
			}}
		/>
	);
}
