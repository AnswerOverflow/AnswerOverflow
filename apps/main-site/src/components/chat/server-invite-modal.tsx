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
import { DiscordIcon } from "@packages/ui/icons/index";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";

type ServerInviteModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	serverName: string;
	discordInviteUrl?: string;
};

const getServerMessage = (serverName: string) =>
	`Hey! Have you considered adding Answer Overflow to ${serverName}?

It makes the content of channels you pick accessible outside of Discord. Otherwise Discord servers are a bit of a black hole of information, but this makes it so people are able to find that content and join the server.

They've got an about page to learn more & it's free to use: https://answeroverflow.com/about`;

export function ServerInviteModal({
	open,
	onOpenChange,
	serverName,
	discordInviteUrl,
}: ServerInviteModalProps) {
	const posthog = usePostHog();
	const [copied, setCopied] = useState(false);
	const defaultMessage = getServerMessage(serverName);
	const [inviteMessage, setInviteMessage] = useState(defaultMessage);

	const handleCopy = async () => {
		trackEvent("Chat Discord CTA Copy Message", { serverName }, posthog);
		await navigator.clipboard.writeText(inviteMessage);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const handleJoinDiscord = () => {
		if (discordInviteUrl) {
			trackEvent(
				"Chat Discord CTA Join",
				{ serverName, inviteUrl: discordInviteUrl },
				posthog,
			);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Add Answer Overflow to {serverName}</DialogTitle>
					<DialogDescription>
						Copy this message and send it to the server admins to request Answer
						Overflow integration
					</DialogDescription>
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
						{discordInviteUrl && (
							<Button
								asChild
								className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white"
							>
								<a
									href={discordInviteUrl}
									target="_blank"
									rel="noopener noreferrer"
									onClick={handleJoinDiscord}
								>
									<DiscordIcon className="size-4 mr-2" />
									Join Discord
								</a>
							</Button>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
