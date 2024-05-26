import { notFound } from 'next/navigation';
import {
	findDiscordAccountById,
	findLatestCommentsFromAuthor,
	findLatestThreadsFromAuthor,
	findManyMessagesWithAuthors,
	findServerByCustomDomain,
	messages,
} from '@answeroverflow/db';
import { LinkButton } from '@answeroverflow/ui/src/ui/link-button';

export type Props = {
	params: { userId: string; domain: string };
};

export async function getUserPageData(props: Props) {
	const server = await findServerByCustomDomain(
		decodeURIComponent(props.params.domain),
	);
	const userInfo = await findDiscordAccountById(props.params.userId);
	if (!userInfo || !server || !server.customDomain) return notFound();
	const [threads, comments] = await Promise.all([
		findLatestThreadsFromAuthor(props.params.userId, {
			serverId: server.id,
		}),
		findLatestCommentsFromAuthor(props.params.userId, {
			serverId: server.id,
		}),
	]);
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
	return { userInfo, threads, comments: commentsWithMessage, server };
}

export async function ActualLayout(
	props: {
		children: React.ReactNode;
	} & Props,
) {
	const { userInfo } = await getUserPageData(props);
	return (
		<>
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
