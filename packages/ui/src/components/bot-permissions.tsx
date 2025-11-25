"use client";

import { Check } from "lucide-react";
import Image from "next/image";
import { cn } from "../lib/utils";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "./accordion";
import { AnswerOverflowIcon } from "./answer-overflow-icon";
import { Button } from "./button";
import { ServerIcon } from "./server-icon";

export interface BotPermission {
	name: string;
	description: string;
	reason: string;
}

const BOT_PERMISSIONS: BotPermission[] = [
	{
		name: "Create Invite",
		description: "Create instant invites",
		reason:
			"Allows Answer Overflow to generate invite links for sharing your indexed content",
	},
	{
		name: "View Channels",
		description: "Read messages and view channels",
		reason:
			"Required to index messages from your channels and make them searchable",
	},
	{
		name: "Send Messages",
		description: "Send messages in text channels",
		reason:
			"Enables Answer Overflow to send solution instructions and helpful messages",
	},
	{
		name: "Send Messages in Threads",
		description: "Send messages in threads",
		reason:
			"Allows Answer Overflow to respond in threads when marking solutions",
	},
	{
		name: "Create Public Threads",
		description: "Create public threads",
		reason:
			"Enables Answer Overflow to create threads for organizing discussions",
	},
	{
		name: "Manage Threads",
		description: "Manage threads",
		reason:
			"Allows Answer Overflow to organize and manage threads for better content organization",
	},
	{
		name: "Embed Links",
		description: "Embed links in messages",
		reason:
			"Required to display rich previews and formatted content in messages",
	},
	{
		name: "Read Message History",
		description: "Read message history",
		reason:
			"Essential for indexing past messages and making your server's knowledge searchable",
	},
	{
		name: "Add Reactions",
		description: "Add reactions to messages",
		reason:
			"Allows Answer Overflow to add reaction indicators for marked solutions",
	},
	{
		name: "Use Application Commands",
		description: "Use slash commands",
		reason:
			"Enables Answer Overflow's slash commands for managing settings and features",
	},
];

interface ServerInfo {
	discordId: bigint;
	name: string;
	icon: string | null;
}

export function BotPermissionsDisplay({
	server,
	onCancel,
	onAdd,
	className,
}: {
	server: ServerInfo;
	onCancel: () => void;
	onAdd: () => void;
	className?: string;
}) {
	return (
		<div className="flex flex-col items-center justify-center sm:py-8 mt-0 sm:mt-[max(-50px,calc((100vh-500px)/2-2rem))]">
			<div className="flex flex-col items-center w-full max-w-md">
				<div
					className={cn(
						"w-full max-h-[600px] rounded-lg border bg-card text-card-foreground shadow-lg overflow-hidden flex flex-col",
						className,
					)}
				>
					{/* Header with icons - fixed */}
					<div className="p-5 pb-3 shrink-0">
						<div className="flex items-center justify-center gap-2.5 mb-3">
							{/* Bot Icon */}
							<div className="relative w-14 h-14 rounded-full bg-muted flex items-center justify-center border-2 border-secondary shrink-0">
								<AnswerOverflowIcon size={56} />
							</div>
							{/* Dots separator */}
							<div className="flex gap-1 shrink-0">
								<div className="w-1 h-1 rounded-full bg-muted-foreground/40" />
								<div className="w-1 h-1 rounded-full bg-muted-foreground/40" />
								<div className="w-1 h-1 rounded-full bg-muted-foreground/40" />
							</div>
							{/* Server Icon */}
							<div className="relative w-14 h-14 shrink-0 border-2 border-secondary rounded-full">
								{server.icon ? (
									<Image
										src={`https://cdn.discordapp.com/icons/${server.discordId}/${server.icon}.webp`}
										alt={server.name}
										fill
										className="rounded-full"
									/>
								) : (
									<ServerIcon
										server={{
											discordId: server.discordId,
											name: server.name,
											icon: server.icon ?? undefined,
										}}
										size={56}
									/>
								)}
							</div>
						</div>
						<div className="text-center">
							<h3 className="text-base font-semibold text-foreground mb-0.5">
								Add Answer Overflow to {server.name}
							</h3>
							<p className="text-xs text-muted-foreground">
								The page will refresh automatically once the bot is added.
							</p>
						</div>
					</div>

					<div className="flex flex-col sm:flex-row gap-2 px-5 pb-3 border-t border-border pt-3 shrink-0">
						<Button
							type="button"
							onClick={onCancel}
							variant="secondary"
							className="flex-1"
						>
							Cancel
						</Button>
						<Button
							type="button"
							onClick={onAdd}
							variant="default"
							className="flex-1"
						>
							Add
						</Button>
					</div>
				</div>

				<div className="w-full mt-3 rounded-lg border bg-card text-card-foreground shadow-lg overflow-hidden">
					<Accordion type="single" collapsible className="w-full">
						<AccordionItem value="permissions" className="border-0">
							<AccordionTrigger className="px-5 py-3 text-xs font-medium hover:no-underline">
								What permissions does Answer Overflow need?
							</AccordionTrigger>
							<AccordionContent className="px-5 pb-4 max-h-[300px] overflow-y-auto">
								<div className="space-y-2">
									{BOT_PERMISSIONS.map((permission) => (
										<div
											key={permission.name}
											className="flex items-start gap-2.5 rounded p-2.5 transition-colors hover:bg-muted/50"
										>
											<div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded bg-primary">
												<Check className="h-2.5 w-2.5 text-primary-foreground" />
											</div>
											<div className="flex-1 min-w-0 space-y-0.5">
												<div className="flex items-baseline gap-1.5 flex-wrap">
													<span className="text-xs font-medium text-foreground">
														{permission.name}
													</span>
													<span className="text-xs text-muted-foreground">
														{permission.description}
													</span>
												</div>
												<p className="text-xs leading-relaxed text-muted-foreground">
													{permission.reason}
												</p>
											</div>
										</div>
									))}
								</div>
							</AccordionContent>
						</AccordionItem>
					</Accordion>
				</div>
			</div>
		</div>
	);
}
