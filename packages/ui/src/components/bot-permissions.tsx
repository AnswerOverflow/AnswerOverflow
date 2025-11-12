"use client";

import { AnswerOverflowIcon } from "./answer-overflow-icon";
import { ServerIcon } from "./server-icon";
import { Check, ChevronDown } from "lucide-react";
import Image from "next/image";
import { cn } from "../lib/utils";
import { useState } from "react";

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
	discordId: string;
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
	const [showPermissions, setShowPermissions] = useState(false);

	return (
		<div className="h-[600px] mt-[246px] flex flex-col items-center justify-start">
			<div
				className={cn(
					"w-full max-w-md max-h-[600px] rounded-lg border bg-card text-card-foreground shadow-lg overflow-hidden flex flex-col",
					className,
				)}
			>
				{/* Header with icons - fixed */}
				<div className="p-5 pb-3 shrink-0">
					<div className="flex items-center justify-center gap-2.5 mb-3">
						{/* Bot Icon */}
						<div className="relative w-14 h-14 rounded-full bg-muted flex items-center justify-center border-2 border-primary shrink-0">
							<AnswerOverflowIcon size={36} />
						</div>
						{/* Dots separator */}
						<div className="flex gap-1 shrink-0">
							<div className="w-1 h-1 rounded-full bg-muted-foreground/40" />
							<div className="w-1 h-1 rounded-full bg-muted-foreground/40" />
							<div className="w-1 h-1 rounded-full bg-muted-foreground/40" />
						</div>
						{/* Server Icon */}
						<div className="relative w-14 h-14 shrink-0">
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
							Review the permissions Answer Overflow needs to function
						</p>
					</div>
				</div>

				{/* Buttons - fixed above accordion */}
				<div className="flex gap-2 px-5 pb-3 border-t border-border pt-3 shrink-0">
					<button
						type="button"
						onClick={onCancel}
						className="flex-1 rounded px-4 py-2 text-sm font-medium bg-secondary text-secondary-foreground transition-colors hover:bg-secondary/80 active:scale-[0.98]"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={onAdd}
						className="flex-1 rounded px-4 py-2 text-sm font-medium bg-primary text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.98]"
					>
						Add
					</button>
				</div>

				{/* Permissions toggle button */}
				<div className="px-5 pb-2 shrink-0">
					<button
						type="button"
						onClick={() => setShowPermissions(!showPermissions)}
						className="w-full flex items-center justify-between text-xs font-medium text-foreground hover:text-primary transition-colors py-2"
					>
						<span>What permissions does Answer Overflow need?</span>
						<ChevronDown
							className={cn(
								"h-4 w-4 transition-transform duration-200",
								showPermissions && "rotate-180",
							)}
						/>
					</button>
				</div>

				{/* Wrapper with fixed height - anchored to top */}
				<div className="flex-1 min-h-0 flex flex-col overflow-hidden">
					{/* Permissions section with scroll - expands downward */}
					<div
						className={cn(
							"flex flex-col border-t border-border overflow-hidden transition-all duration-200 ease-in-out",
							showPermissions
								? "opacity-100 flex-1"
								: "opacity-0 flex-none h-0",
						)}
					>
						{showPermissions && (
							<div className="px-5 pb-3 flex-1 min-h-0 flex flex-col">
								<div className="flex-1 overflow-y-auto space-y-2 pr-1">
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
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
