"use client";

import { useIsNavbarHidden } from "@packages/ui/hooks/use-scroll-container";
import { Loader2 } from "lucide-react";
import { useStickToBottom } from "use-stick-to-bottom";
import { ChatEmptyState } from "./chat-empty-state";
import { ChatHeaderMobile } from "./chat-header-mobile";
import { ChatMessages } from "./chat-messages";
import { ChatPromptInput } from "./chat-prompt-input";

import { ChatStateProvider, useChatContext } from "./chat-state-provider";
import type { GitHubRepo } from "./types";

type ChatInterfaceProps = {
	threadId?: string;
	initialRepo?: GitHubRepo;
};

function ChatInterfaceContent() {
	const chat = useChatContext();
	const isNavbarHidden = useIsNavbarHidden();

	if (chat.session.isPending) {
		return (
			<div
				className={`relative flex w-full flex-col items-center justify-center overflow-hidden ${isNavbarHidden ? "h-dvh" : "h-[calc(100dvh-var(--navbar-height))]"}`}
			>
				<Loader2 className="size-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	const showWarningBanner =
		chat.serverNotIndexed ||
		chat.showDiscordCta ||
		chat.selectedModelRequiresSignIn ||
		(chat.rateLimitStatus && chat.rateLimitStatus.remaining < 3);

	return (
		<div
			className={`relative flex w-full flex-col overflow-hidden ${isNavbarHidden ? "h-dvh" : "h-[calc(100dvh-var(--navbar-height))]"}`}
		>
			<ChatHeaderMobile title={chat.title} />

			<div className="flex-1 overflow-hidden">
				{chat.showEmptyState ? (
					<div className="h-full overflow-y-auto">
						<div
							className={`max-w-4xl mx-auto w-full flex flex-col min-h-full sm:px-6 pt-6 ${
								showWarningBanner ? "lg:pb-40" : "lg:pb-32"
							}`}
						>
							<ChatEmptyState repo={chat.effectiveRepo} title={chat.title} />
							<div className="lg:hidden px-2 sm:px-4">
								<ChatPromptInput compact />
							</div>
						</div>
					</div>
				) : (
					<ChatMessages showWarningBanner={!!showWarningBanner} />
				)}
			</div>

			<div className="hidden lg:block absolute bottom-0 left-0 right-0">
				<div className="max-w-4xl mx-auto w-full px-2 sm:px-4">
					<ChatPromptInput />
				</div>
			</div>
		</div>
	);
}

export function ChatInterface({
	threadId: initialThreadId,
	initialRepo,
}: ChatInterfaceProps) {
	const stickToBottom = useStickToBottom({ initial: "instant" });

	return (
		<ChatStateProvider
			initialThreadId={initialThreadId}
			initialRepo={initialRepo}
			stickToBottom={stickToBottom}
		>
			<ChatInterfaceContent />
		</ChatStateProvider>
	);
}

export type { GitHubRepo } from "./types";
