import type {
	Channel,
	DiscordAccount,
	Message,
} from "@packages/database/convex/schema";
import { Avatar, AvatarFallback, AvatarImage } from "../components/avatar";
import { BlueLink } from "../components/blue-link";
import { Link } from "../components/link";
import { cn } from "../lib/utils";
import { DiscordMarkdown } from "../markdown/discord-markdown";

export interface LinkMessageProps {
	message: Message;
	thread: Channel;
	author?: DiscordAccount | null;
	formattedDate?: string;
	className?: string;
}

export function LinkMessage({
	message,
	thread,
	author,
	formattedDate,
	className,
}: LinkMessageProps) {
	const threadName =
		thread.name || `${message.content?.slice(0, 20).trim()}...`;

	return (
		<div
			className={cn(
				"group relative flex w-full items-start gap-4 rounded-lg border border-border bg-card p-5 text-card-foreground transition-all hover:border-sidebar-border hover:bg-accent/50 hover:shadow-sm",
				className,
			)}
		>
			<Link
				href={`/m/${message.id}`}
				className="absolute inset-0 z-0"
				aria-label={`Open message ${threadName}`}
			/>
			<div className="relative z-10 pointer-events-none [&_a]:pointer-events-auto flex w-full items-start gap-4">
				{author && (
					<Avatar className="size-10 shrink-0">
						<AvatarImage
							src={
								author.avatar
									? `https://cdn.discordapp.com/avatars/${author.id.toString()}/${author.avatar}.webp?size=40`
									: `/discord/${(Number(author.id) % 5).toString()}.png`
							}
							alt={author.name}
						/>
						<AvatarFallback>
							{author.name.charAt(0).toUpperCase()}
						</AvatarFallback>
					</Avatar>
				)}
				<div className="flex-1 min-w-0 flex flex-col gap-2">
					<div className="flex items-center gap-2 flex-wrap">
						<h3 className="font-semibold text-lg leading-tight text-card-foreground group-hover:text-accent-foreground">
							{threadName}
						</h3>
					</div>
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						{author && (
							<>
								<BlueLink href={`/u/${author.id}`} className="font-semibold">
									{author.name}
								</BlueLink>
								{formattedDate && (
									<>
										<span>•</span>
										<span>{formattedDate}</span>
									</>
								)}
							</>
						)}
						{!author && formattedDate && <span>{formattedDate}</span>}
					</div>
					{message.content && (
						<div className="text-sm text-muted-foreground line-clamp-3 group-hover:text-accent-foreground/80">
							<DiscordMarkdown content={message.content} />
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
