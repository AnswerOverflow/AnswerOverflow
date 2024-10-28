import { notFound } from 'next/navigation';

import { ServerPublic } from '@answeroverflow/api';
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
	params: { userId: string };
	searchParams?: { s?: string };
};

export async function getUserPageData(props: Props) {
	const userInfo = await findDiscordAccountById(props.params.userId);
	if (!userInfo) return notFound();
	const [threads, comments, serverIds] = await Promise.all([
		findLatestThreadsFromAuthor(props.params.userId, {
			serverId: props.searchParams?.s,
		}),
		findLatestCommentsFromAuthor(props.params.userId, {
			serverId: props.searchParams?.s,
		}),
		findServersUserHasPostedIn(props.params.userId),
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
								userId={props.params.userId}
								selected={x.id === props.searchParams?.s}
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
