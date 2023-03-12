import type {
	ChannelPublicWithFlags,
	APIMessageWithDiscordAccount,
	ServerPublic,
} from '@answeroverflow/api';
import { Message } from './primitives/Message';
import { SearchBar } from './SearchBar';
import { ServerInviteDriver } from './ServerInviteDriver';

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
	query,
}: MessageResultPageProps) {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const solutionMessageId = messages.at(0)?.solutionIds?.at(0);

	return (
		<div className="sm:mx-3 ">
			<div className=" flex flex-col items-center justify-between gap-2 sm:flex-row">
				<SearchBar className="w-full" defaultValue={query} />
				<div className="shrink-0 ">
					<ServerInviteDriver server={server} channel={channel} />
				</div>
			</div>
			<div className="rounded-md bg-neutral-100 p-3 dark:bg-[#2c2d2d] sm:mt-3">
				<h1 className="rounded-sm border-b-2 border-solid border-neutral-400 pb-2 text-3xl dark:border-neutral-600 dark:text-white">
					{thread ? thread.name : channel.name}
				</h1>
				{messages.map((m) => (
					<Message message={m} />
				))}
			</div>
		</div>
	);
}

export default MessageResultPage;
