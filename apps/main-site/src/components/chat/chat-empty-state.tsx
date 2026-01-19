"use client";

import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@packages/ui/components/avatar";
import { Button } from "@packages/ui/components/button";
import { DiscordIcon } from "@packages/ui/icons/index";
import Image from "next/image";
import { useState } from "react";
import type { DiscordServerContext } from "@/lib/discord-server-types";
import { ServerInviteModal } from "./server-invite-modal";
import type { GitHubRepo } from "./types";

const getInitials = (name: string) =>
	name
		.split(" ")
		.map((part) => part[0])
		.join("")
		.slice(0, 2);

export function ChatEmptyState({
	repo,
	server,
	title,
}: {
	repo: GitHubRepo | null;
	server: DiscordServerContext | null;
	title: string | null;
}) {
	const [inviteModalOpen, setInviteModalOpen] = useState(false);

	if (!repo && !server) {
		return null;
	}

	return (
		<div className="flex flex-1 flex-col items-center justify-center min-h-[50vh]">
			<div className="flex flex-col items-center gap-4 text-center">
				{repo ? (
					<Image
						src={`https://github.com/${repo.owner}.png?size=128`}
						alt={repo.owner}
						width={64}
						height={64}
						className="rounded-full"
						unoptimized
					/>
				) : server ? (
					<Avatar className="size-16">
						<AvatarImage src={server.iconUrl} alt={server.name} />
						<AvatarFallback className="text-xl">
							{getInitials(server.name)}
						</AvatarFallback>
					</Avatar>
				) : null}
				<div className="space-y-2">
					<h1 className="text-2xl font-semibold">{title}</h1>
					<p className="text-muted-foreground">
						{repo
							? `Ask questions about the ${repo.owner}/${repo.repo} codebase`
							: server
								? `Ask questions about ${server.name}`
								: null}
					</p>
				</div>
				{server && (
					<>
						{server.hasBot && server.invite ? (
							<Button
								asChild
								className="bg-[#5865F2] hover:bg-[#4752C4] text-white"
							>
								<a
									href={server.invite}
									target="_blank"
									rel="noopener noreferrer"
								>
									<DiscordIcon className="size-4" />
									Join Server
								</a>
							</Button>
						) : (
							<Button
								className="bg-[#5865F2] hover:bg-[#4752C4] text-white"
								onClick={() => setInviteModalOpen(true)}
							>
								<DiscordIcon className="size-4" />
								Join Server
							</Button>
						)}
						<ServerInviteModal
							open={inviteModalOpen}
							onOpenChange={setInviteModalOpen}
							serverName={server.name}
							discordInviteUrl={server.invite}
						/>
					</>
				)}
			</div>
		</div>
	);
}
