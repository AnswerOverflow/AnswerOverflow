import type { Channel, Message } from "@packages/database/convex/schema";
import Link from "next/link";
import { cn } from "../lib/utils";
import { DiscordMarkdown } from "../markdown/discord-markdown";

export interface LinkMessageProps {
	message: Message;
	thread: Channel;
	className?: string;
}

export function LinkMessage({ message, thread, className }: LinkMessageProps) {
	const threadName =
		thread.name || `${message.content?.slice(0, 20).trim()}...`;

	return (
		<div className={cn("flex w-full flex-col", className)}>
			<div
				className={cn(
					"discord-message w-full border-2 border-black/[.13] dark:border-white/[.13] rounded-lg bg-white dark:bg-gray-900",
					className,
				)}
			>
				<div className="flex flex-col p-6">
					<Link href={`/m/${message.id}`} className="block w-fit mb-2">
						<h3 className="py-2 pt-0 font-semibold text-xl text-blue-700 decoration-2 hover:text-blue-600 hover:underline dark:text-blue-400 hover:dark:text-blue-500">
							{threadName}
						</h3>
					</Link>
					{message.content && (
						<div className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
							<DiscordMarkdown content={message.content} />
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
