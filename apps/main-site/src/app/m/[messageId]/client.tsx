"use client";

import type { Id } from "@packages/database/convex/_generated/dataModel";
import type {
	Attachment,
	Message,
	Reaction,
} from "@packages/database/convex/schema";
import { DiscordMessage } from "@packages/ui/components/discord-message";
import { Link } from "@packages/ui/components/link";

type MessagePageData = {
	messages: Array<{
		message: Message;
		author: {
			id: string;
			name: string;
			avatar?: string;
		} | null;
		attachments: Attachment[];
		reactions: Reaction[];
		solutions: Message[];
		metadata?: {
			users?: Record<string, { username: string; globalName: string | null }>;
			channels?: Record<string, { name: string; type: number }>;
		};
	}>;
	server: {
		_id: Id<"servers">;
		discordId: string;
		name: string;
		icon?: string;
		description?: string;
	};
	channel: {
		id: string;
		name: string;
		type: number;
	};
	thread: {
		id: string;
		name: string;
		type: number;
	} | null;
};

export function MessagePageClient(props: { data: MessagePageData }) {
	const { data } = props;

	if (!data) {
		return (
			<div className="max-w-4xl mx-auto p-8">
				<div className="text-center text-muted-foreground">
					Message not found
				</div>
			</div>
		);
	}

	return (
		<div className="max-w-4xl mx-auto p-8">
			{/* Header */}
			<div className="mb-6 pb-4 border-b border-border">
				<div className="flex items-center gap-3 mb-2">
					<Link
						href={`/c/${data.server.discordId}`}
						className="text-muted-foreground hover:text-foreground transition-colors text-sm"
					>
						← Back to {data.server.name}
					</Link>
				</div>
				<div className="flex items-center gap-3">
					{data.server.icon && (
						<img
							src={`https://cdn.discordapp.com/icons/${data.server.discordId}/${data.server.icon}.webp?size=64`}
							alt={data.server.name}
							className="w-12 h-12 rounded-full"
						/>
					)}
					<div>
						<h1 className="text-2xl font-bold text-foreground">
							{data.server.name}
						</h1>
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<Link
								href={`/c/${data.server.discordId}/${data.channel.id}`}
								className="hover:text-foreground transition-colors"
							>
								#{data.channel.name}
							</Link>
							{data.thread && (
								<>
									<span>/</span>
									<span>{data.thread.name}</span>
								</>
							)}
						</div>
					</div>
				</div>
			</div>

			<div className="space-y-4">
				{data.messages.map((msgData: MessagePageData["messages"][number]) => {
					const {
						message,
						author,
						attachments,
						reactions,
						solutions,
						metadata,
					} = msgData;

					return (
						<DiscordMessage
							key={message.id}
							message={message}
							author={author}
							attachments={attachments}
							reactions={reactions}
							solutions={solutions}
							metadata={metadata}
							getAttachmentUrl={(attachment) => {
								const convexSiteUrl =
									process.env.NEXT_PUBLIC_CONVEX_URL?.replace(
										/\.cloud$/,
										".site",
									);
								return attachment.storageId && convexSiteUrl
									? `${convexSiteUrl}/getAttachment?storageId=${attachment.storageId}`
									: null;
							}}
						/>
					);
				})}
			</div>
		</div>
	);
}
