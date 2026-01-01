"use client";

import {
	ChatInterface,
	type GitHubRepo,
} from "@/components/chat/chat-interface";
import { useParams } from "next/navigation";

export default function RepoChatPage() {
	const params = useParams<{
		domain: string;
		repo: string;
		path?: string[];
	}>();

	const repo: GitHubRepo = {
		owner: params.domain,
		repo: params.repo,
		filePath: params.path?.join("/"),
	};

	return <ChatInterface repos={[repo]} />;
}
