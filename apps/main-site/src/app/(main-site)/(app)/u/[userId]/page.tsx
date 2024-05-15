import {
	findDiscordAccountById,
	findLatestThreadsFromAuthor,
	findManyServersById,
	findServersUserHasPostedIn,
	messages,
} from '@answeroverflow/db';
import { DiscordAvatar } from '@answeroverflow/ui/src/discord-avatar';
import { notFound } from 'next/navigation';
import { FeedPost } from '../../(home)/components';
import { ServerIcon } from '@answeroverflow/ui/src/server-icon';
import { ServerPublic } from '@answeroverflow/api';
import { LinkButton } from 'packages/ui/src/ui/link-button';

type Props = {
	params: { userId: string };
};

function ServerSelect(props: {
	server: Pick<ServerPublic, 'id' | 'name' | 'icon'>;
}) {
	return (
		<LinkButton
			href={`/c/${props.server.id}`}
			variant={'outline'}
			className="gap-2"
		>
			<ServerIcon server={props.server} size={24} />
			<span>{props.server.name}</span>
		</LinkButton>
	);
}

export default async function UserPage(props: Props) {
	const userInfo = await findDiscordAccountById(props.params.userId);
	if (!userInfo) return notFound();
	const threads = await findLatestThreadsFromAuthor(props.params.userId);
	const serverIds = await findServersUserHasPostedIn(props.params.userId);
	const servers = await findManyServersById(serverIds);
	const msgs = await messages.loadMany(threads.map((x) => x.id));
	if (!msgs.some((x) => typeof x?.message === 'object' && x.message?.public))
		return notFound();
	return (
		<div className=" flex w-full justify-center">
			<div className="flex max-w-[650px] flex-col  gap-4">
				<div className="flex flex-row items-center gap-2">
					<DiscordAvatar user={userInfo} size={40} />
					<span className="font-semibold">{userInfo.name}</span>
				</div>
				<div className="flex flex-row flex-wrap items-center gap-2">
					{servers.map((x) => (
						<ServerSelect server={x} key={x.id} />
					))}
				</div>
				<div className={'flex flex-col gap-4'}>
					{threads.map((x) => (
						<FeedPost postId={x.id} key={x.id} />
					))}
				</div>
			</div>
		</div>
	);
}
