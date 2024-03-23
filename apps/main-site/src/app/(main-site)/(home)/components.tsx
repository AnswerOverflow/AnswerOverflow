import {
	channelCountsLoader,
	findServerById,
	messages,
} from '@answeroverflow/db';
import { parse } from '@answeroverflow/ui/src/message/markdown/render';
import Link from '@answeroverflow/ui/src/ui/link';
import { ServerIcon } from '@answeroverflow/ui/src/server-icon';
import { getSnowflakeUTCDate } from '@answeroverflow/ui/src/utils/snowflake';
import { FaRegMessage } from 'react-icons/fa6';
import { LinkButton } from '@answeroverflow/ui/src/ui/link-button';
import '../home.css';
import {
	isImageAttachment,
	MessageImage,
} from '@answeroverflow/ui/src/message/attachments';

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
function shortenNumber(num: number) {
	if (num >= 1000000) {
		return (num / 1000000).toFixed(1) + 'M';
	} else if (num >= 1000) {
		return (num / 1000).toFixed(1) + 'k';
	} else {
		return num.toString();
	}
}
export const TrendingServer = async (props: { serverId: string }) => {
	const server = await findServerById(props.serverId);
	if (!server) return null;
	const approximateMemberCount = server.approximateMemberCount;
	return (
		<LinkButton
			href={`/c/${server.id}`}
			variant={'outline'}
			className={'flex w-full flex-row justify-between gap-2 bg-card'}
		>
			<div className={'flex items-center gap-2'}>
				<ServerIcon server={server} size={24} />
				<span>{server.name}</span>
			</div>
			<span>{shortenNumber(approximateMemberCount)} members</span>
		</LinkButton>
	);
};
