"use client";

import { useIsNavbarHidden } from "@packages/ui/hooks/use-scroll-container";
import { useUserSubscription } from "@packages/ui/hooks/use-user-subscription";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useStickToBottom } from "use-stick-to-bottom";
import { ChatEmptyState } from "./chat-empty-state";
import { ChatHeaderMobile } from "./chat-header-mobile";
import { ChatMessages } from "./chat-messages";
import { ChatPromptInput } from "./chat-prompt-input";

import { ChatStateProvider, useChatContext } from "./chat-state-provider";
import type { GitHubRepo } from "./types";

function CheckoutSuccessHandler() {
	const [checkout, setCheckout] = useQueryState(
		"checkout",
		parseAsStringLiteral(["success", "canceled"]),
	);
	const { syncAfterCheckout } = useUserSubscription();

	useQuery({
		queryKey: ["checkout-sync", checkout],
		queryFn: async () => {
			if (checkout !== "success") return null;
			await syncAfterCheckout();
			setCheckout(null);
			return true;
		},
		enabled: checkout === "success",
		staleTime: Number.POSITIVE_INFINITY,
	});

	return null;
}

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

			<div className="flex-1 overflow-hidden relative">
				{chat.showEmptyState ? (
					<div className="h-full overflow-y-auto">
						<div
							className={`max-w-4xl mx-auto w-full flex flex-col min-h-full sm:px-6 pt-6 pb-16 ${
								showWarningBanner ? "lg:pb-40" : "lg:pb-32"
							}`}
						>
							<ChatEmptyState
								repo={chat.effectiveRepo}
								server={chat.effectiveServerContext}
								title={chat.title}
							/>
						</div>
					</div>
				) : (
					<ChatMessages showWarningBanner={!!showWarningBanner} />
				)}
				<div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none">
					<div className="max-w-4xl mx-auto w-full px-2 lg:px-4 pointer-events-auto">
						<ChatPromptInput />
					</div>
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
			<CheckoutSuccessHandler />
			<ChatInterfaceContent />
		</ChatStateProvider>
	);
}

export type { GitHubRepo } from "./types";
