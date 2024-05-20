import {
	findDiscordAccountById,
	findLatestThreadsFromAuthor,
	findServerByCustomDomain,
	messages,
} from '@answeroverflow/db';
import { DiscordAvatar } from '@answeroverflow/ui/src/discord-avatar';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { FeedPost } from '@answeroverflow/ui/src/feed-post';

type Props = {
	params: { userId: string; domain: string };
};

async function getUserPageData(props: Props) {
	const server = await findServerByCustomDomain(
		decodeURIComponent(props.params.domain),
	);
	const userInfo = await findDiscordAccountById(props.params.userId);
	if (!userInfo || !server) return notFound();
	const threads = await findLatestThreadsFromAuthor(props.params.userId, {
		serverId: server.id,
	});
	const msgs = await messages.loadMany(threads.map((x) => x.id));
	if (!msgs.some((x) => typeof x?.message === 'object' && x.message?.public))
		return notFound();
	return { userInfo, threads, server };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
	const { userInfo, server } = await getUserPageData(props);
	return {
		title: `${userInfo.name} Posts - ${server.name}`,
		description: `See posts from ${userInfo.name} from ${server.name}'s Discord`,
		alternates: {
			canonical: `https://${server.customDomain}/u/${userInfo.id}`,
		},
		openGraph: {
			title: `${userInfo.name} Posts - ${server.name}`,
			description: `See posts from ${userInfo.name} from ${server.name}'s Discord`,
		},
	};
}

export default async function UserPage(props: Props) {
	const { userInfo, threads } = await getUserPageData(props);
	return (
		<main className="flex w-full justify-center pt-4">
			<div className="flex w-full max-w-[850px]  flex-col gap-4">
				<div className="flex flex-row items-center gap-2">
					<DiscordAvatar user={userInfo} size={64} />
					<span className="text-4xl font-semibold">{userInfo.name}</span>
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
