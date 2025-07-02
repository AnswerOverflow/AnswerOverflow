import { ServerPublic } from '@answeroverflow/api/router/types';
import { CommunityPageData } from '@answeroverflow/core/pages';
import { LinkMessage } from '../../message/link-message';

export const ChannelOverview = (
	props: CommunityPageData & {
		tenant: ServerPublic | undefined;
		selectedChannel:
			| Pick<CommunityPageData, 'channels'>['channels'][number]
			| undefined;
		page: number | undefined;
		children: React.ReactNode;
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
		<>
			<div className="bg-[#36393f] border-b border-[#2f3136] px-4 py-3 shadow-sm">
				<div className="flex items-center">
					<span className="text-[#8e9297] mr-2">#</span>
					<span className="text-white font-semibold text-base">
						{selected?.name}
					</span>
				</div>
			</div>
			<div className="flex-1 p-4 overflow-y-auto relative">
				<div className="flex flex-col gap-4">
					<div className="flex flex-col gap-3 relative">
						{questions.map((question) => (
							<LinkMessage
								key={question.message.id}
								message={question.message}
								thread={question.thread}
								className="rounded-standard drop-shadow-sm"
							/>
						))}
					</div>
				</div>
			</div>
		</>
	);
};
