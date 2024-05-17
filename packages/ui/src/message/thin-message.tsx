import { DiscordAvatar } from '../discord-avatar';
import { TimeAgo } from '../ui/time-ago';
import { cn } from '../utils/utils';
import { MessageBlurrer, MessageBody } from './Message';
import { MessageProps } from './props';

export function ThinMessage(
	props: Pick<MessageProps, 'message'> & {
		isSolution?: boolean;
	},
) {
	const { message } = props;
	return (
		<MessageBlurrer message={message}>
			<div className="flex flex-row">
				<div className="mb-8 w-[40px] flex-shrink-0">
					<DiscordAvatar user={message.author} size={40} />
					<div className={cn('mx-auto h-full w-0 rounded-full border-1')} />
				</div>
				<div className="flex flex-col pl-2 pt-2">
					<div className="flex flex-row items-center gap-2 text-muted-foreground">
						<span className="mr-1">{message.author.name}</span>
						<span className="text-sm ">•</span>
						<TimeAgo snowflake={message.id} />
					</div>
					<div>
						<MessageBody message={message} />
					</div>
				</div>
			</div>
		</MessageBlurrer>
	);
}
