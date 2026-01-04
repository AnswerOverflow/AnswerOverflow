"use client";

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

type DiscordInviteCTAProps = {
	repoOwner: string;
	repoName: string;
	discordInviteCode?: string;
};

const DEFAULT_INVITE_MESSAGE = `Hey! Have you guys thought about adding Answer Overflow to this server? It makes Discord conversations searchable on Google so people can find answers without asking the same questions. Check it out: https://answeroverflow.com/about`;

export function DiscordInviteCTA({
	repoOwner,
	repoName,
	discordInviteCode,
}: DiscordInviteCTAProps) {
	const [modalOpen, setModalOpen] = useState(false);
	const [copied, setCopied] = useState(false);
	const [inviteMessage, setInviteMessage] = useState(DEFAULT_INVITE_MESSAGE);

	const discordLink = discordInviteCode
		? `https://discord.gg/${discordInviteCode}`
		: null;

	const handleCopy = async () => {
		await navigator.clipboard.writeText(inviteMessage);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<>
			<div className="flex items-center gap-2 rounded-t-md border-2 border-b-0 bg-secondary px-3 py-1.5">
				<MessageCircle className="size-3.5 shrink-0 text-muted-foreground" />
				<span className="flex-1 truncate text-xs text-muted-foreground">
					Get better answers by inviting them to index their Discord with Answer
					Overflow
				</span>
				<Button
					size="sm"
					variant="ghost"
					className="h-6 shrink-0 px-2 text-xs"
					onClick={() => setModalOpen(true)}
				>
					Learn more
				</Button>
			</div>

			<Dialog open={modalOpen} onOpenChange={setModalOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>
							Improve results for {repoOwner}/{repoName}
						</DialogTitle>
						<DialogDescription>
							Ask the admins of their Discord server to add Answer Overflow to
							get content from Discord being used in the chat
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
							{discordLink ? (
								<Button asChild className="w-full">
									<a
										href={discordLink}
										target="_blank"
										rel="noopener noreferrer"
									>
										<MessageCircle className="size-4 mr-2" />
										Join Discord
									</a>
								</Button>
							) : (
								<p className="text-sm text-muted-foreground">
									Find their Discord invite in the project README
								</p>
							)}
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
