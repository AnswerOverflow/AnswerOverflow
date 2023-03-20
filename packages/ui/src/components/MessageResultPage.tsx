import type {
	ChannelPublicWithFlags,
	APIMessageWithDiscordAccount,
	ServerPublic,
} from '@answeroverflow/api';
import { Message } from './primitives/Message';
import { MessagesSearchBar } from './search/SearchPage';
import { ServerInvite } from './ServerInvite';

export type MessageResultPageProps = {
	messages: APIMessageWithDiscordAccount[];
	server: ServerPublic;
	channel: ChannelPublicWithFlags;
	thread?: ChannelPublicWithFlags;
	// The query that lead to this result page
	query?: string;
};

// TODO: Align text to be same level with the avatar
export function MessageResultPage({
	messages,
	server,
	channel,
	thread,
}: MessageResultPageProps) {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const solutionMessageId = messages.at(0)?.solutionIds?.at(0);

	return (
		<div className="sm:mx-3">
			<div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
				<MessagesSearchBar className="mb-0" />
				<div className="ml-20 shrink-0">
					<ServerInvite server={server} channel={channel} />
				</div>
			</div>
			<div className="rounded-md sm:mt-3">
				<h1 className="rounded-sm border-b-2 border-solid border-neutral-400 pb-2 text-3xl dark:border-neutral-600 dark:text-white">
					{thread ? thread.name : channel.name}
				</h1>
				{messages.map((m) => (
					<Message message={m} key={m.id} />
				))}
			</div>
		</div>
	);
}

export default MessageResultPage;
