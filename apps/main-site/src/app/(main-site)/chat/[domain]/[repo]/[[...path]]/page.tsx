"use client";

import {
	ChatInterface,
	type GitHubRepoContext,
} from "@/components/chat/chat-interface";
import { useParams } from "next/navigation";

export default function RepoChatPage() {
	const params = useParams<{
		domain: string;
		repo: string;
		path?: string[];
	}>();

	const repoContext: GitHubRepoContext = {
		owner: params.domain,
		repo: params.repo,
		filePath: params.path?.join("/"),
	};

	return <ChatInterface repoContext={repoContext} />;
}
