import {
	findDiscordAccountById,
	findLatestThreadsFromAuthor,
	findManyServersById,
	findServersUserHasPostedIn,
	messages,
} from '@answeroverflow/db';
import { DiscordAvatar } from '@answeroverflow/ui/src/discord-avatar';
import { notFound } from 'next/navigation';
import { FeedPost } from '@answeroverflow/ui/src/feed-post';
import { ServerIcon } from '@answeroverflow/ui/src/server-icon';
import { ServerPublic } from '@answeroverflow/api';
import { LinkButton } from 'packages/ui/src/ui/link-button';
import { Metadata } from 'next';

type Props = {
	params: { userId: string };
	searchParams: { s?: string };
};

async function getUserPageData(props: Props) {
	const userInfo = await findDiscordAccountById(props.params.userId);
	if (!userInfo) return notFound();
	const threads = await findLatestThreadsFromAuthor(props.params.userId, {
		serverId: props.searchParams.s,
	});
	const serverIds = await findServersUserHasPostedIn(props.params.userId);
	const servers = await findManyServersById(serverIds);
	const msgs = await messages.loadMany(threads.map((x) => x.id));
	if (!msgs.some((x) => typeof x?.message === 'object' && x.message?.public))
		return notFound();
	return { userInfo, threads, servers };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
	const { userInfo } = await getUserPageData(props);
	return {
		title: `${userInfo.name} Posts - Answer Overflow`,
		description: `See posts from ${userInfo.name} on Answer Overflow`,
		alternates: {
			canonical: `/u/${userInfo.id}`,
		},
		openGraph: {
			title: `${userInfo.name} Posts - Answer Overflow`,
			description: `See posts from ${userInfo.name} on Answer Overflow`,
		},
	};
}

function ServerSelect(props: {
	server: Pick<ServerPublic, 'id' | 'name' | 'icon'>;
	userId: string;
	selected: boolean;
}) {
	return (
		<LinkButton
			href={
				props.selected
					? `/u/${props.userId}`
					: `/u/${props.userId}?s=${props.server.id}`
			}
			variant={props.selected ? 'secondary' : 'outline'}
			className="gap-2"
		>
			<ServerIcon server={props.server} size={24} />
			<span>{props.server.name}</span>
		</LinkButton>
	);
}

export default async function UserPage(props: Props) {
	const { userInfo, threads, servers } = await getUserPageData(props);
	return (
		<main className=" flex w-full justify-center pt-4">
			<div className="flex w-full max-w-[850px] flex-col gap-4">
				<div className="flex flex-row items-center gap-2">
					<DiscordAvatar user={userInfo} size={64} />
					<span className="text-4xl font-semibold">{userInfo.name}</span>
				</div>
				<span className="text-xl">Explore posts from servers</span>
				<div className="flex flex-row flex-wrap items-center gap-2">
					{servers.map((x) => (
						<ServerSelect
							server={x}
							key={x.id}
							userId={props.params.userId}
							selected={x.id === props.searchParams.s}
						/>
					))}
				</div>
				<span className="text-xl">Posts</span>
				<div className={'flex flex-col gap-4'}>
					{threads.map((x) => (
						<FeedPost postId={x.id} key={x.id} />
					))}
				</div>
			</div>
		</main>
	);
}
