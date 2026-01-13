"use client";

import { trackEvent, usePostHog } from "@packages/ui/analytics/client";
import { Button } from "@packages/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@packages/ui/components/dialog";
import { Textarea } from "@packages/ui/components/textarea";
import { CheckIcon, CopyIcon, MessageCircle } from "lucide-react";
import { useState } from "react";

type DiscordInviteCTAProps =
	| {
			variant?: "repo";
			repoOwner: string;
			repoName: string;
			discordInviteCode?: string;
	  }
	| {
			variant: "server";
			serverName: string;
			discordInviteUrl?: string;
	  };

const DEFAULT_REPO_MESSAGE = `Hey! Have you guys thought about adding Answer Overflow to this server? It makes Discord conversations searchable on Google so people can find answers without asking the same questions. Check it out: https://answeroverflow.com/about`;

const getServerMessage = (serverName: string) =>
	`Hey! I've been using Answer Overflow's AI chat to find answers from our Discord. It's really helpful, but our server (${serverName}) isn't indexed yet.

Could we add Answer Overflow? It makes our Discord discussions searchable on Google and lets the AI assistant find answers from our community.

Here's how to add it: https://answeroverflow.com/about`;

export function DiscordInviteCTA(props: DiscordInviteCTAProps) {
	const posthog = usePostHog();
	const [modalOpen, setModalOpen] = useState(false);
	const [copied, setCopied] = useState(false);

	const isServer = props.variant === "server";
	const defaultMessage = isServer
		? getServerMessage(props.serverName)
		: DEFAULT_REPO_MESSAGE;
	const [inviteMessage, setInviteMessage] = useState(defaultMessage);

	const discordLink = isServer
		? props.discordInviteUrl
		: props.discordInviteCode
			? `https://discord.gg/${props.discordInviteCode}`
			: null;

	const bannerText = isServer
		? `${props.serverName} isn't indexed yet. Ask the mods to add Answer Overflow.`
		: "Get better answers by inviting them to index their Discord with Answer Overflow";

	const title = isServer
		? `Add Answer Overflow to ${props.serverName}`
		: `Improve results for ${props.repoOwner}/${props.repoName}`;

	const description = isServer
		? "Copy this message and send it to the server admins to request Answer Overflow integration"
		: "Ask the admins of their Discord server to add Answer Overflow to get content from Discord being used in the chat";

	const handleCtaClick = () => {
		trackEvent(
			"Chat Discord CTA Click",
			isServer
				? { serverName: props.serverName }
				: { repoOwner: props.repoOwner, repoName: props.repoName },
			posthog,
		);
		setModalOpen(true);
	};

	const handleCopy = async () => {
		trackEvent(
			"Chat Discord CTA Copy Message",
			isServer
				? { serverName: props.serverName }
				: { repoOwner: props.repoOwner, repoName: props.repoName },
			posthog,
		);
		await navigator.clipboard.writeText(inviteMessage);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const handleJoinDiscord = () => {
		if (discordLink) {
			trackEvent(
				"Chat Discord CTA Join",
				isServer
					? { serverName: props.serverName, inviteUrl: props.discordInviteUrl }
					: {
							repoOwner: props.repoOwner,
							repoName: props.repoName,
							inviteCode: props.discordInviteCode,
						},
				posthog,
			);
		}
	};

	return (
		<>
			<div className="flex items-center gap-2 rounded-t-md border-2 border-b-0 bg-secondary px-3 py-1.5">
				<MessageCircle className="size-3.5 shrink-0 text-muted-foreground" />
				<span className="flex-1 truncate text-xs text-muted-foreground">
					{bannerText}
				</span>
				<Button
					size="sm"
					variant="ghost"
					className="h-6 shrink-0 px-2 text-xs"
					onClick={handleCtaClick}
				>
					{isServer ? "Copy instructions" : "Learn more"}
				</Button>
			</div>

			<Dialog open={modalOpen} onOpenChange={setModalOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
						<DialogDescription>{description}</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div className="space-y-2">
							<div className="relative">
								<Textarea
									value={inviteMessage}
									onChange={(e) => setInviteMessage(e.target.value)}
									className="min-h-[100px] pr-12 resize-none"
								/>
								<Button
									size="sm"
									variant="outline"
									className="absolute top-2 right-2"
									onClick={handleCopy}
								>
									{copied ? (
										<CheckIcon className="size-3" />
									) : (
										<CopyIcon className="size-3" />
									)}
								</Button>
							</div>
						</div>
						<div className="space-y-2">
							{discordLink ? (
								<Button asChild className="w-full">
									<a
										href={discordLink}
										target="_blank"
										rel="noopener noreferrer"
										onClick={handleJoinDiscord}
									>
										<MessageCircle className="size-4 mr-2" />
										{isServer ? "Open Discord" : "Join Discord"}
									</a>
								</Button>
							) : !isServer ? (
								<p className="text-sm text-muted-foreground">
									Find their Discord invite in the project README
								</p>
							) : null}
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
