"use client";

import type { AgentStatus } from "@packages/database/convex/schema";
import {
	Message,
	MessageContent,
} from "@packages/ui/components/ai-elements/message";
import { Loader2 } from "lucide-react";

export function AgentStatusIndicator({
	status,
	error,
	repoName,
}: {
	status: AgentStatus;
	error?: string | null;
	repoName?: string | null;
}) {
	if (status === "cloning_repo") {
		return (
			<Message from="assistant">
				<MessageContent>
					<span className="flex items-center gap-2 text-sm text-muted-foreground">
						<Loader2 className="size-3 animate-spin" />
						{repoName ? `Cloning ${repoName}...` : "Cloning repository..."}
					</span>
				</MessageContent>
			</Message>
		);
	}

	if (status === "error") {
		return (
			<Message from="assistant">
				<MessageContent>
					<span className="text-sm text-destructive">
						{error ?? "An error occurred"}
					</span>
				</MessageContent>
			</Message>
		);
	}

	return (
		<Message from="assistant">
			<MessageContent>
				<div className="flex items-center gap-1">
					<span className="animate-[pulse_1s_ease-in-out_infinite]">.</span>
					<span className="animate-[pulse_1s_ease-in-out_0.2s_infinite]">
						.
					</span>
					<span className="animate-[pulse_1s_ease-in-out_0.4s_infinite]">
						.
					</span>
				</div>
			</MessageContent>
		</Message>
	);
}
