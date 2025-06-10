import { ServerPublic } from '@answeroverflow/api/router/types';
import { CommunityPageData } from '@answeroverflow/core/pages';

export const DiscordCommunityPageTheme = (
	props: CommunityPageData & {
		tenant: ServerPublic | undefined;
		selectedChannel:
			| Pick<CommunityPageData, 'channels'>['channels'][number]
			| undefined;
		page: number | undefined;
		uwu?: boolean;
	},
) => {
	const {
		server,
		channels,
		selectedChannel: maybeSelectedChannel,
		tenant,
		posts: questions,
	} = props;
	const selected = maybeSelectedChannel ?? channels[0];
	return (
		<div className="flex flex-row gap-4">
			<div>
				<span className="text-lg font-semibold">Channels</span>
				<div className="flex flex-col gap-2">
					{channels.map((channel) => (
						<div key={channel.id}>{channel.name}</div>
					))}
				</div>
			</div>
			<div>
				<span className="text-lg font-semibold">Selected channel</span>
				<div className="flex flex-col gap-2">
					<div>{selected?.name}</div>
				</div>
			</div>
			<div>
				<span className="text-lg font-semibold">Questions</span>
				<div className="flex flex-col gap-2">
					{questions.map((question) => (
						<div key={question.message.id}>{question.message.content}</div>
					))}
				</div>
			</div>
		</div>
	);
};
