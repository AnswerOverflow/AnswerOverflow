import type {
	ChannelPublicWithFlags,
	CommunityPageData,
} from '@answeroverflow/db';
import { useTrackEvent } from '@answeroverflow/hooks';
import { serverToAnalyticsData } from '@answeroverflow/constants/src/analytics';
import { getServerDescription } from '~ui/utils/other';
import { Button } from '~ui/components/primitives/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '~ui/components/primitives/ui/dropdown-menu';
import { Heading } from '~ui/components/primitives/base/Heading';
import {
	ChannelName,
	ServerInviteJoinButton,
} from '~ui/components/primitives/ServerInvite';
import { ServerIcon } from '~ui/components/primitives/ServerIcon';
import { LinkMessage } from '~ui/components/primitives/message/link-message';
import { Navbar } from '~ui/components/primitives/navbar/Navbar';
import AOHead from '~ui/components/primitives/AOHead';
import { Footer } from '~ui/components/primitives/Footer';
import { LinkButton } from '~ui/components/primitives/base/LinkButton';
import Link from 'next/link';
import { MessagesSearchBar } from '~ui/components/primitives/messages-search-bar';

type ChannelSelectProps = {
	channels: ChannelPublicWithFlags[];
	selectedChannel: ChannelPublicWithFlags;
};

function ChannelSidebar(props: ChannelSelectProps) {
	const ChannelSelect = ({ channel }: { channel: ChannelPublicWithFlags }) => {
		const selected = props.selectedChannel.id === channel.id;
		return (
			<LinkButton
				className={
					selected
						? 'bg-accent text-left text-accent-foreground'
						: 'bg-inherit text-left dark:bg-inherit'
				}
				variant={'ghost'}
				href={`/c/${channel.serverId}/${channel.id}`}
			>
				<ChannelName channel={channel} />
			</LinkButton>
		);
	};

	const channels = props.channels;
	return (
		<div className="mr-4 max-w-[250px]">
			<Heading.H4 className="ml-4 text-left">Channels</Heading.H4>
			<div className="flex shrink-0 flex-col gap-2 text-left">
				{channels.map((channel) => (
					<ChannelSelect channel={channel} key={channel.id} />
				))}
			</div>
		</div>
	);
}

function ChannelDropdown(props: ChannelSelectProps) {
	return (
		<DropdownMenu modal={false}>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" className="w-full">
					<ChannelName channel={props.selectedChannel} />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="max-h-vh30 w-vw80">
				{props.channels.map((channel) => (
					<DropdownMenuItem key={channel.id} asChild>
						<Link href={`/c/${channel.serverId}/${channel.id}`}>
							<ChannelName channel={channel} />
						</Link>
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export const CommunityPage = ({
	server,
	channels,
	isOnTenantSite,
}: CommunityPageData) => {
	const selectedChannelId = channels[0]?.channel.id;

	// useTrackEvent('Community Page View', serverToAnalyticsData(server));

	const selectedChannel = channels.find(
		(c) => c.channel.id === selectedChannelId,
	);

	const questions = selectedChannel?.questions ?? null;

	const HeroArea = () => {
		return (
			<div className="flex flex-col">
				<div className="m-auto flex w-full flex-row bg-gradient-to-r from-[#7196CD] to-[#82adbe] px-4 py-8 dark:to-[#113360] sm:px-8 xl:px-[7rem] xl:py-16 2xl:py-20">
					<div className={'mx-auto flex flex-row gap-4'}>
						<ServerIcon server={server} size={128} className="hidden sm:flex" />
						<div>
							<Heading.H1 className="hidden pt-0 md:block">
								{server.name}
							</Heading.H1>
							<div className={'hidden md:block'}>
								<Heading.H2 className="text-xl font-normal">
									{getServerDescription(server)}
								</Heading.H2>
								<ServerInviteJoinButton
									className="mx-auto mt-2 w-fit px-10 text-lg sm:mx-0"
									server={server}
									location={'Community Page'}
									channel={selectedChannel?.channel}
								/>
							</div>
						</div>
						<div className="flex w-full flex-col items-center text-center md:hidden">
							<div className="flex flex-row items-center justify-center gap-2">
								<ServerIcon
									server={server}
									size={64}
									className="flex sm:hidden"
								/>
								<Heading.H1 className="pt-0 text-3xl">{server.name}</Heading.H1>
							</div>
							<Heading.H2 className="text-base font-normal">
								{server.description ??
									`Join the community to ask questions about ${server.name} and get answers from other members.`}
							</Heading.H2>
							<ServerInviteJoinButton
								className="mx-auto mt-2 w-fit px-10 text-lg sm:mx-0"
								server={server}
								location={'Community Page'}
								channel={selectedChannel?.channel}
							/>
						</div>
					</div>
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
				<div className="flex flex-col items-center">
					<Heading.H4 className="text-center">
						No questions found for this channel.
					</Heading.H4>
				</div>
			);
		}
		const qs = questions.map((question) => (
			<LinkMessage
				key={question.message.id}
				message={question.message}
				thread={question.thread}
				className="rounded-standard drop-shadow-sm"
			/>
		));
		return <div className="flex w-full flex-1 flex-col gap-2">{qs}</div>;
	};

	const CommunityQuestionsSection = () => (
		<>
			<MessagesSearchBar
				placeholder={`Search the ${server.name} community`}
				serverId={server.id}
			/>
			<div className="flex w-full justify-center py-2 md:hidden">
				{selectedChannel && (
					<ChannelDropdown
						channels={channels.map((c) => c.channel)}
						selectedChannel={selectedChannel.channel}
					/>
				)}
			</div>
			<div className="flex flex-row pt-4">
				<div className="hidden md:block">
					{selectedChannel && (
						<ChannelSidebar
							channels={channels.map((c) => c.channel)}
							selectedChannel={selectedChannel.channel}
						/>
					)}
				</div>
				<MessagesSection />
			</div>
		</>
	);

	return (
		<div className="mx-auto w-full overflow-x-hidden overflow-y-scroll bg-background scrollbar-hide">
			<Navbar
				isOnTenantSite={server.customDomain != null}
				tenant={server}
				hideIcon={isOnTenantSite}
			/>
			<main className="bg-background">
				<AOHead
					title={`${server.name} Community`}
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
			<Footer isOnTenantSite={server.customDomain != null} />
		</div>
	);
};
