import { ServerPublic } from '@answeroverflow/api/router/types';
import { CommunityPageData } from '@answeroverflow/core/pages';
import { MessagesSearchBar } from '../../messages-search-bar';
import { ServerInvite, ServerInviteJoinButton } from '../../server-invite';

export const DiscordThemeLayout = (
	props: Omit<CommunityPageData, 'posts'> & {
		tenant: ServerPublic | undefined;
		children: React.ReactNode;
	},
) => {
	const { server, channels } = props;

	return (
		<div className="flex flex-col min-h-screen bg-[#36393f]">
			<div className="fixed top-0 left-0 right-0 z-50 bg-[#2f3136] shadow-lg border-b border-[#202225]">
				<div className="relative max-w-none w-full px-4 py-3">
					<div className="relative flex items-center justify-between w-full">
						<div className="flex items-center flex-shrink-0">
							<img
								src="https://images.squarespace-cdn.com/content/v1/52d47ba1e4b0fc71b73d39ad/fad952a6-d559-4f8d-ad91-da2b8199679a/migaku+logo.png"
								alt={`${server.name} logo`}
								className="h-12 w-auto object-contain"
							/>
						</div>
						<div className="flex items-center flex-1 max-w-2xl mx-8 min-w-0 translate-y-2">
							<MessagesSearchBar
								placeholder="Search channels, questions..."
								className="w-full"
								serverId={server.id}
							/>
						</div>
						<div className="flex items-center space-x-4 flex-shrink-0"></div>
					</div>
				</div>
			</div>
			<div className="flex-1">
				<div className="flex flex-row h-screen overflow-hidden">
					<div className="w-60 bg-[#2f3136] border-r border-[#202225] flex flex-col h-full overflow-y-auto">
						<div className="h-20 flex-shrink-0"></div>
						<div className="p-3 flex-1 overflow-y-auto">
							<div className="bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f0f1b] border border-purple-900/30 rounded-lg p-4 shadow-sm mb-4">
								<div className="text-[#dcddde]">
									<div className="font-semibold text-base mb-1 text-white">
										{server.name} on Discord
									</div>
									<div className="text-sm text-purple-300 mb-2">
										Jump into the {server.name}'s Discord now
									</div>
									<div className="font-bold text-sm mb-3 text-green-400">
										{`${server.approximateMemberCount?.toLocaleString()} members`}
									</div>
								</div>
								<ServerInviteJoinButton
									server={server}
									location="Community Page"
									className="w-full"
									channel={channels[0]}
								/>
							</div>
							<div className="flex-1 overflow-y-auto">
								<div className="flex items-center justify-between mb-2 px-2">
									<span className="text-[#8e9297] uppercase text-xs font-semibold tracking-wide">
										Channels
									</span>
								</div>
								<div className="flex flex-col">
									{channels.map((channel) => (
										<div
											key={channel.id}
											className="flex items-center p-1.5 px-2 rounded hover:bg-[#36393f] cursor-pointer text-[#b9bbbe] hover:text-[#dcddde] text-sm transition-colors group"
										>
											<span className="text-[#8e9297] mr-2 group-hover:text-[#b9bbbe]">
												#
											</span>
											<span className="truncate">{channel.name}</span>
										</div>
									))}
								</div>
							</div>
						</div>
					</div>
					<div className="flex-1 bg-[#36393f] flex flex-col h-full pt-20">
						{props.children}
					</div>
				</div>
			</div>
		</div>
	);
};
