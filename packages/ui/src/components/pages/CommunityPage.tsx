import type {
	ChannelPublicWithFlags,
	CommunityPageData,
} from '@answeroverflow/db';
import { useTenantContext, useTrackEvent } from '@answeroverflow/hooks';
import { serverToAnalyticsData } from '@answeroverflow/constants/src/analytics';
import { useState } from 'react';
import {
	Footer,
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	Heading,
	Navbar,
	LinkMessage,
	ChannelName,
	ServerInvite,
	ServerInviteJoinButton,
	ServerIcon,
	DropdownMenuTrigger,
	AOHead,
} from '../primitives';
import { MessagesSearchBar } from './SearchPage';
import { getServerDescription } from '~ui/utils/other';

type ChannelSelectProps = {
	channels: ChannelPublicWithFlags[];
	selectedChannel: ChannelPublicWithFlags;
	setSelectedChannelId: (id: string) => void;
};

function ChannelSidebar(props: ChannelSelectProps) {
	const ChannelSelect = ({ channel }: { channel: ChannelPublicWithFlags }) => {
		const selected = props.selectedChannel.id === channel.id;
		return (
			<Button
				className={
					selected ? 'text-left' : 'bg-inherit text-left dark:bg-inherit'
				}
				variant={'ghost'}
				onClick={() => props.setSelectedChannelId(channel.id)}
				selected={selected}
			>
				<ChannelName channel={channel} />
			</Button>
		);
	};

	const channels = props.channels;
	return (
		<div className="mr-4 ">
			<Heading.H4 className="my-0 py-0">Channels</Heading.H4>
			<div className="flex shrink-0 flex-col gap-2">
				{channels.map((channel) => (
					<ChannelSelect channel={channel} key={channel.id} />
				))}
			</div>
		</div>
	);
}

function ChannelDropdown(props: ChannelSelectProps) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" className="w-full">
					<ChannelName channel={props.selectedChannel} />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="max-h-vh30 w-vw80">
				{props.channels.map((channel) => (
					<DropdownMenuItem
						key={channel.id}
						onClick={() => props.setSelectedChannelId(channel.id)}
					>
						<ChannelName channel={channel} />
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export const CommunityPage = ({ server, channels }: CommunityPageData) => {
	const [selectedChannelId, setSelectedChannelId] = useState<null | string>(
		channels.at(0)?.channel.id ?? null,
	);
	const { isOnTenantSite } = useTenantContext();
	useTrackEvent('Community Page View', serverToAnalyticsData(server));

	const selectedChannel = channels.find(
		(c) => c.channel.id === selectedChannelId,
	);

	const questions = selectedChannel?.questions ?? null;

	const HeroArea = () => {
		return (
			<div className="flex flex-col">
				<div className="my-auto flex flex-row bg-gradient-to-r from-[#7196CD] to-[#82adbe] px-4 py-8 dark:to-[#113360] sm:px-8 xl:px-[7rem] xl:py-16 2xl:py-20">
					<ServerInvite
						server={server}
						location="Community Page"
						channel={selectedChannel?.channel}
						Icon={
							<ServerIcon
								server={server}
								size="xl"
								className="hidden sm:flex"
							/>
						}
						Body={
							<>
								<div className="hidden md:ml-16 md:flex md:flex-col">
									<Heading.H1 className="pt-0">{server.name}</Heading.H1>
									<Heading.H2 className="text-xl font-normal">
										{getServerDescription(server)}
									</Heading.H2>
									<ServerInviteJoinButton className="mx-auto mt-2 w-fit px-10 text-lg sm:mx-0" />
								</div>
								<div className="flex w-full flex-col items-center text-center md:hidden">
									<div className="flex flex-row items-center justify-center gap-2">
										<ServerIcon
											server={server}
											size="lg"
											className="flex sm:hidden"
										/>
										<Heading.H1 className="pt-0 text-3xl">
											{server.name}
										</Heading.H1>
									</div>
									<Heading.H2 className="text-base font-normal">
										{server.description ??
											`${server.name} community. Join the community to ask questions about ${server.name} and get answers from other members.`}
									</Heading.H2>
									<ServerInviteJoinButton className="mx-auto mt-2 w-fit px-10 text-lg sm:mx-0" />
								</div>
							</>
						}
						JoinButton={<></>}
					/>
				</div>
			</div>
		);
	};

	const MessagesSection = () => {
		if (!selectedChannel) {
			return (
				<Heading.H4 className="text-center">No channel selected.</Heading.H4>
			);
		}
		if (!questions || questions.length === 0) {
			return (
				<div className="flex flex-col items-center justify-center">
					<Heading.H4 className="text-center">
						No questions found for this channel.
					</Heading.H4>
				</div>
			);
		}
		const qs = questions.map((question) => (
			<div className="drop-shadow-sm " key={question.message.id}>
				<LinkMessage
					message={question.message}
					thread={question.thread}
					className="rounded-standard"
				/>
			</div>
		));
		return <div className="flex w-full flex-1 flex-col gap-2">{qs}</div>;
	};

	const CommunityQuestionsSection = () => (
		<>
			<Heading.H3 className="text-center md:text-left">
				Community questions
			</Heading.H3>

			<MessagesSearchBar
				placeholder={`Search the ${server.name} community`}
				serverId={server.id}
				className="py-6"
			/>
			<div className="flex w-full justify-center py-2 md:hidden">
				{selectedChannel && (
					<ChannelDropdown
						channels={channels.map((c) => c.channel)}
						selectedChannel={selectedChannel.channel}
						setSelectedChannelId={setSelectedChannelId}
					/>
				)}
			</div>
			<div className="flex flex-row pt-4">
				<div className="hidden md:block">
					{selectedChannel && (
						<ChannelSidebar
							channels={channels.map((c) => c.channel)}
							selectedChannel={selectedChannel.channel}
							setSelectedChannelId={setSelectedChannelId}
						/>
					)}
				</div>
				<MessagesSection />
			</div>
		</>
	);

	return (
		<div className="mx-auto w-full overflow-x-hidden overflow-y-scroll bg-ao-white scrollbar-hide dark:bg-ao-black">
			<Navbar />
			<main className="bg-ao-white dark:bg-ao-black">
				<AOHead
					title={`${server.name} Community Page`}
					description={
						server.description ?? isOnTenantSite
							? `${server.name} community - Join the community to ask questions about ${server.name} and get answers from other members!`
							: `The community page for ${server.name} on Answer Overflow.`
					}
					path={isOnTenantSite ? '/' : `/c/${server.id}`}
					server={server}
				/>

				<HeroArea />
				<div className="py-8">
					<div className="px-4 2xl:px-[6rem]">
						<CommunityQuestionsSection />
					</div>
				</div>
			</main>
			<Footer />
		</div>
	);
};
