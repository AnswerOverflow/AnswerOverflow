"use client";

import { trackEvent, usePostHog } from "@packages/ui/analytics/client";
import { Button } from "@packages/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@packages/ui/components/card";
import { Textarea } from "@packages/ui/components/textarea";
import { DiscordIcon } from "@packages/ui/icons/index";
import { CheckIcon, CopyIcon, Users } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

type DiscordInviteLandingProps = {
	inviteCode: string;
	guildId: string;
	guildName: string;
	guildIconUrl: string | null;
	guildDescription: string | null;
	memberCount: number;
	onlineCount: number;
};

const getServerMessage = (serverName: string) =>
	`Hey! Have you considered adding Answer Overflow to ${serverName}?

It makes the content of channels you pick accessible outside of Discord. Otherwise Discord servers are a bit of a black hole of information, but this makes it so people are able to find that content and join the server.

They've got an about page to learn more & it's free to use: https://answeroverflow.com/about`;

export function DiscordInviteLanding({
	inviteCode,
	guildId,
	guildName,
	guildIconUrl,
	guildDescription,
	memberCount,
	onlineCount,
}: DiscordInviteLandingProps) {
	const posthog = usePostHog();
	const discordInviteUrl = `https://discord.com/invite/${inviteCode}`;

	const [copied, setCopied] = useState(false);
	const defaultMessage = getServerMessage(guildName);
	const [inviteMessage, setInviteMessage] = useState(defaultMessage);

	const handleCopy = async () => {
		trackEvent(
			"Invite Page Copy Message",
			{ serverName: guildName, guildId },
			posthog,
		);
		await navigator.clipboard.writeText(inviteMessage);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const handleJoinDiscord = () => {
		trackEvent(
			"Invite Page Join Discord",
			{ serverName: guildName, guildId, inviteUrl: discordInviteUrl },
			posthog,
		);
	};

	return (
		<div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<div className="flex justify-center mb-4">
						{guildIconUrl ? (
							<Image
								src={guildIconUrl}
								alt={guildName}
								width={80}
								height={80}
								className="rounded-full"
								unoptimized
							/>
						) : (
							<div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-2xl font-semibold">
								{guildName
									.split(" ")
									.map((n) => n[0])
									.join("")
									.slice(0, 2)}
							</div>
						)}
					</div>
					<CardTitle className="text-2xl">{guildName}</CardTitle>
					{guildDescription && (
						<CardDescription className="text-base">
							{guildDescription}
						</CardDescription>
					)}
					<div className="flex items-center justify-center gap-4 text-sm text-muted-foreground mt-2">
						<div className="flex items-center gap-1">
							<Users className="h-4 w-4" />
							<span>{memberCount.toLocaleString()} members</span>
						</div>
						<div className="flex items-center gap-1">
							<span className="w-2 h-2 rounded-full bg-green-500" />
							<span>{onlineCount.toLocaleString()} online</span>
						</div>
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					<Button
						asChild
						className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white"
						size="lg"
					>
						<a
							href={discordInviteUrl}
							target="_blank"
							rel="noopener noreferrer"
							onClick={handleJoinDiscord}
						>
							<DiscordIcon className="size-4" />
							Join {guildName} on Discord
						</a>
					</Button>

					<div className="relative">
						<div className="absolute inset-0 flex items-center">
							<span className="w-full border-t" />
						</div>
						<div className="relative flex justify-center text-xs uppercase">
							<span className="bg-card px-2 text-muted-foreground">
								Not on Answer Overflow yet
							</span>
						</div>
					</div>

					<div className="space-y-3">
						<p className="text-sm text-muted-foreground text-center">
							Help this community get discovered! Copy this message and send it
							to the server admins:
						</p>
						<div className="relative">
							<Textarea
								value={inviteMessage}
								onChange={(e) => setInviteMessage(e.target.value)}
								className="min-h-[120px] pr-12 resize-none text-sm"
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
				</CardContent>
			</Card>
		</div>
	);
}
