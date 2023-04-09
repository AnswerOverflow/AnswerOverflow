import type {
	ChannelPublicWithFlags,
	APIMessageWithDiscordAccount,
	ServerPublic,
} from '@answeroverflow/api';
import { useIsUserInServer } from '~ui/utils/hooks';
import {
	AOHead,
	Message,
	MultiMessageBlurrer,
	ServerInvite,
	ChannelIcon,
} from '../primitives';
import { MessagesSearchBar } from './SearchPage';
import { useTrackEvent } from '@answeroverflow/hooks';
export type MessageResultPageProps = {
	messages: APIMessageWithDiscordAccount[];
	server: ServerPublic;
	channel: ChannelPublicWithFlags;
	thread?: ChannelPublicWithFlags;
	requestedId: string;
};

// TODO: Align text to be same level with the avatar
export function MessageResultPage({
	messages,
	server,
	channel,
	requestedId,
	thread,
}: MessageResultPageProps) {
	const isUserInServer = useIsUserInServer(server.id);
	const firstMessage = messages.at(0);
	if (!firstMessage) throw new Error('No message found'); // TODO: Handle this better
	const channelName = thread?.name ?? channel.name;
	const description =
		firstMessage && firstMessage.content?.length > 0
			? firstMessage.content
			: `Questions related to ${channelName} in ${server.name}`;

	useTrackEvent(
		'Message Page View',
		{
			'Channel Id': channel.id,
			'Channel Name': channel.name,
			'Message Id': firstMessage.id,
			'Message Author Id': firstMessage.author.id,
			'Number of Messages': messages.length,
			'Server Id': server.id,
			'Server Name': server.name,
			'Thread Id': thread?.id,
			'Thread Name': thread?.name,
		},
		{
			runOnce: true,
			enabled: isUserInServer === 'in_server',
		},
	);
	const solutionMessageId = messages.at(0)?.solutionIds?.at(0);

	let consecutivePrivateMessages = 0;
	const messageStack = messages.map((message, index) => {
		const nextMessage = messages.at(index + 1);
		if (!message.public && isUserInServer !== 'not_in_server') {
			consecutivePrivateMessages++;
			if (nextMessage && !nextMessage.public) {
				return;
			}
		} else {
			consecutivePrivateMessages = 0;
		}
		// TODO: Remove when embeds are supported
		if (
			(message.public || isUserInServer === 'in_server') &&
			message.content.length === 0 &&
			message.attachments.length === 0
		)
			return null;

		const Msg = ({ count }: { count: number }) => (
			<Message
				key={message.id}
				message={message}
				fullRounded
				Blurrer={(props) => <MultiMessageBlurrer {...props} count={count} />}
			/>
		);

		if (message.id === solutionMessageId) {
			return (
				<div className="text-green-700 dark:text-green-400" key={message.id}>
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
			<AOHead
				description={description}
				path={`/m/${firstMessage?.id ?? requestedId}`}
				title={`${channelName} - ${server.name}`}
				server={server}
			/>

			<div className="my-8 flex flex-col items-center justify-between gap-2 sm:flex-row sm:py-0">
				<MessagesSearchBar />
				<div className="shrink-0 sm:pl-8">
					<ServerInvite
						server={server}
						channel={channel}
						location="Message Result Page"
					/>
				</div>
			</div>
			<div className="rounded-md">
				<div className="mb-4 flex flex-row items-center justify-start rounded-sm border-b-2 border-solid border-neutral-400 pb-2 text-center leading-5 dark:border-neutral-600  dark:text-white">
					<ChannelIcon channelType={channel.type} className="h-6 w-6" />
					<h1 className="text-3xl">
						{thread ? `${thread.name}` : `${channel.name}`}
					</h1>
				</div>
				<div className="flex flex-col gap-4">{messageStack}</div>
			</div>
		</div>
	);
}

export default MessageResultPage;
