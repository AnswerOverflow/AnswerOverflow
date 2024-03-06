import { Metadata } from 'next';
import './home.css';
import { LinkButton } from '@answeroverflow/ui/src/ui/link-button';
import { MessagesSearchBar } from '@answeroverflow/ui/src/messages-search-bar';
import { ServerIcon } from '@answeroverflow/ui/src/server-icon';
import Link from '@answeroverflow/ui/src/ui/link';
import { Footer } from '@answeroverflow/ui/src/footer';
import { Navbar } from '@answeroverflow/ui/src/navbar';
import { ServerPublic } from '~api/router/server/types';
import Marquee from 'react-fast-marquee';
import { Suspense } from 'react';
import {
	ChannelWithFlags,
	findChannelById,
	findMessageByIdWithDiscordAccount,
	findServerById,
	MessageWithDiscordAccount,
	ServerWithFlags,
} from '@answeroverflow/db';
import { FaRegMessage } from 'react-icons/fa6';
import { parse } from '@answeroverflow/ui/src/message/markdown/render';
import {
	getDate,
	getSnowflakeUTCDate,
} from '@answeroverflow/ui/src/utils/snowflake';

const HeroAreaText = () => {
	return (
		<div className="flex h-full w-[calc(100vw-2rem)] max-w-screen-lg flex-col items-center justify-center gap-6 rounded-3xl border-2 border-solid border-primary/[.6] bg-background/[.4] bg-clip-padding px-4 py-8 backdrop-blur-3xl sm:w-[80vw] sm:p-8 md:p-16">
			<h1 className="text-center font-header text-5xl font-bold leading-[114.5%] text-primary md:text-7xl">
				Search all of Discord
			</h1>
			<div className="flex w-full flex-col items-center justify-center gap-8 sm:hidden sm:flex-row">
				<Suspense>
					<MessagesSearchBar />
				</Suspense>
			</div>
			<h2 className="text-center font-body text-lg text-primary/[.95] sm:w-4/5 md:text-2xl">
				Answer Overflow is a Discord search engine. Find results from indexed
				content or a community to join.
			</h2>
			<div className="hidden w-full flex-col items-center justify-center gap-8 sm:flex sm:flex-row">
				<Suspense>
					<MessagesSearchBar />
				</Suspense>
			</div>
			<div className="grid w-full grid-cols-1 grid-rows-2 gap-4 sm:w-auto sm:grid-cols-2 sm:grid-rows-1  sm:gap-8">
				<LinkButton
					size={'lg'}
					className={'w-full text-xl'}
					href={'/search?q=nextjs+trpc+app+router'}
				>
					Try a search
				</LinkButton>
				<LinkButton
					size={'lg'}
					variant={'outline'}
					href={'/onboarding'}
					className={'w-full  text-xl'}
				>
					Add your server
				</LinkButton>
			</div>
		</div>
	);
};

const ServerGrid = (props: {
	servers: Pick<ServerPublic, 'id' | 'icon' | 'name'>[];
}) => {
	return (
		<Marquee speed={20}>
			<div
				className={
					'my-auto mr-8 grid min-h-[calc(100vh-5rem)] grid-flow-col grid-rows-5 gap-8 py-4 md:grid-rows-4 md:gap-16'
				}
			>
				{props.servers.map((server) => {
					return (
						<Link
							className={
								'flex items-center blur-sm brightness-[80%] transition-all duration-1000 hover:blur-none hover:brightness-100 hover:duration-300 dark:brightness-50 dark:hover:brightness-100'
							}
							href={`/c/${server.id}`}
							key={server.id}
							tabIndex={-1}
						>
							<ServerIcon
								server={server}
								size={160}
								className={
									'max-h-[92px] max-w-[92px] md:max-h-full md:max-w-full'
								}
							/>
						</Link>
					);
				})}
			</div>
		</Marquee>
	);
};

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
				<ServerIcon server={server} size={24} />
				<span>{server.name}</span>
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
			<div className={'max-h-[300px] overflow-hidden whitespace-break-spaces'}>
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
export default async function HomePage() {
	return (
		<div className="flex w-full flex-col items-center bg-background font-body">
			<div className={'w-full max-w-screen-3xl'}>
				<Navbar tenant={undefined} />
			</div>
			<div className={'mx-auto flex max-w-[650px] flex-col gap-4'}>
				<FeedPost postId={'1214786746609573908'} />
				<FeedPost postId={'1214800638131834921'} />
			</div>
			<Footer tenant={undefined} />
		</div>
	);
}
