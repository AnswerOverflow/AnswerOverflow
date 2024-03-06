import { Metadata } from 'next';
import './home.css';
import { LinkButton } from '@answeroverflow/ui/src/ui/link-button';
import { ServerIcon } from '@answeroverflow/ui/src/server-icon';
import Link from '@answeroverflow/ui/src/ui/link';
import { Footer } from '@answeroverflow/ui/src/footer';
import { Navbar } from '@answeroverflow/ui/src/navbar';
import {
	findChannelById,
	findMessageByIdWithDiscordAccount,
	findServerById,
} from '@answeroverflow/db';
import { FaArrowTrendUp, FaRegMessage } from 'react-icons/fa6';
import { parse } from '@answeroverflow/ui/src/message/markdown/render';
import { getSnowflakeUTCDate } from '@answeroverflow/ui/src/utils/snowflake';
import { PiPlant } from 'react-icons/pi';

export const metadata: Metadata = {
	alternates: {
		canonical: '/',
	},
};

/*
.outer {
position: relative;
background-color: red;
}

.outer > a {
position: absolute;
top: 0; left: 0; bottom: 0; right: 0;
}

.inner {
position: relative;
pointer-events: none;
z-index: 1;
}

.inner a {
pointer-events: all;
}
 */

const FeedPost = async (props: { postId: string }) => {
	const message = await findMessageByIdWithDiscordAccount(props.postId);
	if (!message || !message.parentChannelId) return null;
	const thread = await findChannelById(message.channelId);
	const parent = await findChannelById(message.parentChannelId);
	const server = await findServerById(message.serverId);
	if (!thread || !parent || !server) return null;
	const discordMarkdownAsHTML = await parse(message.content);

	const MainContent = () => (
		<div className={'inner'}>
			<div className="flex items-center gap-2 pb-2 text-xs md:text-base">
				<Link
					href={`/c/${server.id}`}
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
							href={`/c/${parent.serverId}/${parent.id}`}
						>
							#{parent.name}
						</Link>
					</span>
				</div>
			</div>
			<div className={'pb-2 font-semibold'}>
				<span className={'text-lg'}>{thread.name}</span>
			</div>
			{/*
			Make the overflow fade out from 1 to 0 opacity
			*/}
			<div
				className={
					'max-h-[300px] overflow-hidden whitespace-break-spaces font-body text-primary'
				}
			>
				{discordMarkdownAsHTML}
			</div>
			<div className={'pt-2'}>
				<div className={'flex items-center gap-2'}>
					<FaRegMessage className={'size-4'} />
					<span>300 replies</span>
				</div>
			</div>
		</div>
	);

	return (
		<div
			className={'outer rounded-md border-1 p-2 hover:border-muted-foreground'}
		>
			<Link href={`/m/${thread.id}`} />
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
const TrendingServer = async (props: { serverId: string }) => {
	const server = await findServerById(props.serverId);
	if (!server) return null;
	server.approximateMemberCount = 1000000;
	return (
		<LinkButton
			href={`/c/${server.id}`}
			variant={'outline'}
			className={'flex w-full flex-row justify-between gap-2'}
		>
			<div className={'flex items-center gap-2'}>
				<ServerIcon server={server} size={24} />
				<span>{server.name}</span>
			</div>
			<span>{shortenNumber(server.approximateMemberCount)} members</span>
		</LinkButton>
	);
};

export default function HomePage() {
	return (
		<div className="flex w-full flex-col items-center bg-background font-body">
			<div className={'w-full max-w-screen-3xl'}>
				<Navbar tenant={undefined} />
			</div>
			<div className={'flex flex-row'}>
				<div
					className={'mr-4 flex h-fit w-[400px] flex-col gap-4 border-1 p-4'}
				>
					<div className={'text-sm font-bold text-white'}>Trending Servers</div>
					<TrendingServer serverId={'1037547185492996207'} />
					<TrendingServer serverId={'1037547185492996207'} />
					<TrendingServer serverId={'1037547185492996207'} />
					<TrendingServer serverId={'1037547185492996207'} />
					<TrendingServer serverId={'1037547185492996207'} />
				</div>
				<div className={'mx-auto flex max-w-[650px] flex-col gap-4 px-4'}>
					<div className={'rounded-md border-1 p-2'}>
						<span>
							Welcome to Answer Overflow! This site is an aggregator for Discord
							content. You can find the most popular and trending content here.
							You can also find the newest content here.
						</span>
					</div>
					<div className={'flex gap-4'}>
						<LinkButton
							className={'flex items-center gap-4'}
							href={'/trending'}
							variant={'outline'}
						>
							<FaArrowTrendUp className={'size-4'} />
							<span className={'text-sm'}>Trending</span>
						</LinkButton>
						<LinkButton
							className={'flex items-center gap-4'}
							href={'/new'}
							variant={'outline'}
						>
							<PiPlant className={'size-4'} />
							<span className={'text-sm'}>New</span>
						</LinkButton>
					</div>
					<FeedPost postId={'1214786746609573908'} />
					<FeedPost postId={'1214800638131834921'} />
					<FeedPost postId={'1214786746609573908'} />
					<FeedPost postId={'1214800638131834921'} />
					<FeedPost postId={'1214786746609573908'} />
					<FeedPost postId={'1214800638131834921'} />
					<FeedPost postId={'1214786746609573908'} />
					<FeedPost postId={'1214800638131834921'} />
					<FeedPost postId={'1214786746609573908'} />
					<FeedPost postId={'1214800638131834921'} />
					<FeedPost postId={'1214786746609573908'} />
					<FeedPost postId={'1214800638131834921'} />
					<FeedPost postId={'1214786746609573908'} />
					<FeedPost postId={'1214800638131834921'} />
				</div>
			</div>
			<Footer tenant={undefined} />
		</div>
	);
}
