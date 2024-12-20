import { notFound } from 'next/navigation';

import { ServerPublic } from '@answeroverflow/api/router/types';
import {
	findLatestCommentsFromAuthor,
	findLatestThreadsFromAuthor,
	findServersUserHasPostedIn,
} from '@answeroverflow/core/channel';
import { findDiscordAccountById } from '@answeroverflow/core/discord-account';
import {
	findManyMessagesWithAuthors,
	messages,
} from '@answeroverflow/core/message';
import { findManyServersById } from '@answeroverflow/core/server';
import { ServerIcon } from '@answeroverflow/ui/server-icon';
import { LinkButton } from '@answeroverflow/ui/ui/link-button';

export type Props = {
	params: Promise<{ userId: string }>;
	searchParams: Promise<{ s?: string }>;
};

export async function getUserPageData(props: Props) {
	const params = await props.params;
	const searchParams = await props.searchParams;
	const { userId } = params;
	const userInfo = await findDiscordAccountById(userId);
	if (!userInfo) return notFound();
	const { s } = searchParams;
	const [threads, comments, serverIds] = await Promise.all([
		findLatestThreadsFromAuthor(userId, {
			serverId: s,
		}),
		findLatestCommentsFromAuthor(userId, {
			serverId: s,
		}),
		findServersUserHasPostedIn(userId),
	]);
	const servers = await findManyServersById(serverIds, {
		includeKicked: false,
	});
	const commentsWithMessage = await findManyMessagesWithAuthors(
		comments.map((x) => x.id),
	);
	const msgs = await messages.loadMany(threads.map((x) => x.id));
	const hasSomePublicData =
		commentsWithMessage.some((comment) => comment.public) ||
		msgs.some(
			(thread) => typeof thread?.message === 'object' && thread.message.public,
		);
	if (!hasSomePublicData) return notFound();
	return { userInfo, threads, servers, comments: commentsWithMessage };
}

export function ServerSelect(props: {
	server: Pick<ServerPublic, 'id' | 'name' | 'icon'>;
	userId: string;
	selected: boolean;
}) {
	return (
		<LinkButton
			href={props.selected ? `/u/${props.userId}` : `?s=${props.server.id}`}
			variant={props.selected ? 'secondary' : 'outline'}
			className="gap-2"
		>
			<ServerIcon server={props.server} size={24} />
			<span>{props.server.name}</span>
		</LinkButton>
	);
}

export async function ActualLayout(
	props: {
		children: React.ReactNode;
	} & Props,
) {
	const { userInfo, servers } = await getUserPageData(props);
	const { userId } = await props.params;
	const { s } = await props.searchParams;
	return (
		<>
			{servers.length > 1 && (
				<>
					<span className="text-xl">Explore posts from servers</span>
					<div className="flex flex-row flex-wrap items-center gap-2">
						{servers.map((x) => (
							<ServerSelect
								server={x}
								key={x.id}
								userId={userId}
								selected={x.id === s}
							/>
						))}
					</div>
				</>
			)}
			<div className="flex flex-row gap-4">
				<LinkButton
					variant={'outline'}
					selectedVariant={'secondary'}
					href={`/u/${userInfo.id}`}
				>
					Posts
				</LinkButton>
				<LinkButton
					variant={'outline'}
					selectedVariant={'secondary'}
					href={`/u/${userInfo.id}/comments`}
				>
					Comments
				</LinkButton>
			</div>
			{props.children}
		</>
	);
}
