import { channelCountsLoader, messages } from '@answeroverflow/db';
import { isImageAttachment, MessageImage } from './message/attachments';
import { getSnowflakeUTCDate } from './utils/snowflake';
import { parse } from './message/markdown/render';
import './feed-post.css';
import Link from './ui/link';
import { ServerIcon } from './server-icon';
import { FaRegMessage } from 'react-icons/fa6';

export const FeedPost = async (props: { postId: string }) => {
	const result = await messages.load(props.postId);
	if (!result) return null;
	const { message, channel, parent, server } = result;
	const count = await channelCountsLoader.load(channel.id);
	if (!message || !message.parentChannelId || !message.public) return null;
	const discordMarkdownAsHTML = await parse(message.content);

	const firstImage = message.attachments.filter(isImageAttachment).at(0);
	const MainContent = () => (
		<div className={'inner'}>
			<div className="flex flex-col items-start gap-2  pb-2 text-xs sm:flex-row sm:items-center md:text-base">
				<Link
					href={`/c/${message.serverId}`}
					className={'flex items-center gap-2 hover:underline'}
				>
					<ServerIcon server={server} size={24} />
					<span>{server.name}</span>
				</Link>
				<div className={'flex flex-col gap-2 md:flex-row'}>
					<span className={'hidden text-sm text-muted-foreground md:block'}>
						•
					</span>
					<span className={'text-sm text-muted-foreground'}>
						Created by {message.author.name} on{' '}
						{getSnowflakeUTCDate(message.id)} in{' '}
						<Link
							className={'hover:underline'}
							href={`/c/${channel.serverId}/${parent.id}`}
						>
							#{parent.name}
						</Link>
					</span>
				</div>
			</div>
			<div className={'pb-2 font-semibold'}>
				<span className={'text-lg'}>{channel.name}</span>
			</div>
			<div
				className={
					'max-h-[300px] overflow-hidden whitespace-break-spaces font-body text-primary'
				}
			>
				{firstImage ? (
					<MessageImage attachment={firstImage} />
				) : (
					<>{discordMarkdownAsHTML}</>
				)}
			</div>
			<div className={'pt-2'}>
				<div className={'flex items-center gap-2'}>
					<FaRegMessage className={'size-4'} />
					<span>{count ?? 0} replies</span>
				</div>
			</div>
		</div>
	);

	return (
		<div
			className={
				'outer rounded-md border-2 bg-card p-2 hover:border-muted-foreground'
			}
		>
			<Link href={`/m/${channel.id}`} />
			<MainContent />
		</div>
	);
};
