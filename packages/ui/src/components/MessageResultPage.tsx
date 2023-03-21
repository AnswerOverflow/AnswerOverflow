import type {
	ChannelPublicWithFlags,
	APIMessageWithDiscordAccount,
	ServerPublic,
} from '@answeroverflow/api';
import { useIsUserInServer } from '../utils';
import { Message, MultiMessageBlurrer } from './primitives/Message';
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

	let consecutivePrivateMessages = 0;
	const isUserInServer = useIsUserInServer(server.id);
	const messageStack = messages.map((message, index) => {
		const nextMessage = messages.at(index + 1);
		if (!message.public && !isUserInServer) {
			consecutivePrivateMessages++;
			if (nextMessage && !nextMessage.public) {
				return;
			}
		} else {
			consecutivePrivateMessages = 0;
		}
		const Msg = ({ count }: { count: number }) => (
			<Message
				key={message.id}
				message={message}
				Blurrer={(props) => <MultiMessageBlurrer {...props} count={count} />}
			/>
		);

		if (message.id === solutionMessageId) {
			return (
				<div className="text-green-500 dark:text-green-400" key={message.id}>
					Solution
					<div
						className="rounded-lg border-2 border-green-500  dark:border-green-400 "
						key={message.id}
					>
						<Msg key={message.id} count={consecutivePrivateMessages} />
					</div>
				</div>
			);
		}
		return <Msg key={message.id} count={consecutivePrivateMessages} />;
	});

	return (
		<div className="sm:mx-3 ">
			<div className=" flex flex-col items-center justify-between gap-2 sm:flex-row">
				<MessagesSearchBar />
				<div className="shrink-0 pl-8">
					<ServerInvite server={server} channel={channel} />
				</div>
			</div>
			<div className="rounded-md sm:mt-3">
				<h1 className="rounded-sm border-b-2 border-solid border-neutral-400 pb-2 text-3xl dark:border-neutral-600 dark:text-white">
					{thread ? thread.name : channel.name}
				</h1>
				<div className="flex flex-col gap-2">{messageStack}</div>
			</div>
		</div>
	);
}

export default MessageResultPage;
