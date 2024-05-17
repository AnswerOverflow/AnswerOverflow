import type {
	ChannelPublicWithFlags,
	CommunityPageData,
} from '@answeroverflow/db';
import { NUMBER_OF_THREADS_TO_LOAD } from '@answeroverflow/constants/src/api';
import { getServerDescription } from '../utils/server';
import { Button } from '../ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Heading } from '../ui/heading';
import { ChannelName, ServerInviteJoinButton } from '../server-invite';
import { ServerIcon } from '../server-icon';
import { LinkMessage } from '../message/link-message';
import { Navbar } from '../navbar';
import { Footer } from '../footer';
import { LinkButton } from '../ui/link-button';
import Link from '../ui/link';
import { MessagesSearchBar } from '../messages-search-bar';
import type { ServerPublic } from '@answeroverflow/api/src/router/server/types';
import { LuArrowLeft, LuArrowRight } from 'react-icons/lu';
import { TrackLoad } from '../ui/track-load';
import { serverToAnalyticsData } from '@answeroverflow/constants';
import { Suspense } from 'react';
type ChannelSelectProps = {
	channels: ChannelPublicWithFlags[];
	selectedChannel: ChannelPublicWithFlags;
	tenant: ServerPublic | undefined;
};

function ChannelSidebar(props: ChannelSelectProps) {
	const ChannelSelect = ({ channel }: { channel: ChannelPublicWithFlags }) => {
		const selected = props.selectedChannel.id === channel.id;
		return (
			<LinkButton
				variant={selected ? 'secondary' : 'ghost'}
				className="px-0"
				href={
					props.tenant
						? `/c/${channel.id}`
						: `/c/${channel.serverId}/${channel.id}`
				}
			>
				<ChannelName channel={channel} />
			</LinkButton>
		);
	};

	const channels = props.channels;
	return (
		<div className="mr-4 max-w-[250px]">
			<Heading.H4 className="px-4 text-center">Channels</Heading.H4>
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
						<Link
							href={
								props.tenant
									? `/c/${channel.id}`
									: `/c/${channel.serverId}/${channel.id}`
							}
						>
							<ChannelName channel={channel} />
						</Link>
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

const PageSwitcher = (props: {
	numQuestions: number;
	page: number;
	selectedChannel: ChannelPublicWithFlags;
	tenant: ServerPublic | undefined;
}) => (
	<div className={'flex w-full flex-row justify-between'}>
		{props.page > 0 ? (
			<LinkButton
				variant={'outline'}
				href={
					props.page > 1
						? `?page=${props.page - 1}`
						: props.tenant
						? `/c/${props.selectedChannel.id}`
						: `/c/${props.selectedChannel.serverId}/${props.selectedChannel.id}`
				}
			>
				<LuArrowLeft className={'mr-2'} />
				Previous
			</LinkButton>
		) : (
			<Button variant={'outline'} disabled={true}>
				<LuArrowLeft className={'mr-2'} />
				Previous
			</Button>
		)}
		{props.numQuestions === NUMBER_OF_THREADS_TO_LOAD ? (
			<LinkButton
				variant={'outline'}
				href={
					props.tenant
						? `/c/${props.selectedChannel.id}?page=${props.page + 1}`
						: `/c/${props.selectedChannel.serverId}/${
								props.selectedChannel.id
						  }?page=${props.page + 1}`
				}
			>
				Next
				<LuArrowRight className={'ml-2'} />
			</LinkButton>
		) : (
			<Button variant={'outline'} disabled={true}>
				Next
				<LuArrowRight className={'ml-2'} />
			</Button>
		)}
	</div>
);
import Image from 'next/image';
export const CommunityPage = (
	props: CommunityPageData & {
		tenant: ServerPublic | undefined;
		selectedChannel:
			| Pick<CommunityPageData, 'channels'>['channels'][number]
			| undefined;
		page: number | undefined;
		uwu?: boolean;
	},
) => {
	const { server, channels, selectedChannel, tenant, posts: questions } = props;
	// useTrackEvent('Community Page View', serverToAnalyticsData(server));
	const { page = 0 } = props;
	const isNuxtUwu = server.id === '473401852243869706' && props.uwu;
	const HeroArea = () => {
		return (
			<div className="flex flex-col">
				<div className="m-auto flex w-full flex-row bg-gradient-to-r from-[#7196CD] to-[#82adbe] px-4 py-8 dark:to-[#113360] sm:px-8 xl:px-[7rem] xl:py-16 2xl:py-20">
					<div className={'mx-auto flex flex-row gap-4'}>
						{isNuxtUwu ? (
							<Image
								src="/uwu/nuxt.png"
								width={300}
								height={168}
								alt="Uwuified Nuxt Logo"
								className="hidden sm:flex"
							/>
						) : (
							<ServerIcon
								server={server}
								size={128}
								className="hidden sm:flex"
							/>
						)}

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
									channel={selectedChannel}
								/>
							</div>
						</div>
						<div className="flex w-full flex-col items-center text-center md:hidden">
							{isNuxtUwu && (
								<Image
									src="/uwu/nuxt.png"
									width={300 / 1.5}
									height={168 / 1.5}
									alt="Uwuified Nuxt Logo"
									className="flex sm:hidden"
								/>
							)}
							<div className="flex flex-row items-center justify-center gap-2">
								{!isNuxtUwu && (
									<>
										<ServerIcon
											server={server}
											size={64}
											className="flex sm:hidden"
										/>
										<Heading.H1 className="pt-0 text-3xl">
											{server.name}
										</Heading.H1>
									</>
								)}
							</div>
							<Heading.H2 className="text-base font-normal">
								{server.description ??
									`Join the community to ask questions about ${server.name} and get answers from other members.`}
							</Heading.H2>
							<ServerInviteJoinButton
								className="mx-auto mt-2 w-fit px-10 text-lg sm:mx-0"
								server={server}
								location={'Community Page'}
								channel={selectedChannel}
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
		return (
			<div className="flex w-full flex-1 flex-col gap-2">
				{qs}
				<PageSwitcher
					tenant={tenant}
					numQuestions={questions.length}
					page={page}
					selectedChannel={selectedChannel}
				/>
			</div>
		);
	};

	const CommunityQuestionsSection = () => (
		<>
			<Suspense>
				<MessagesSearchBar
					placeholder={`Search the ${server.name} community`}
					serverId={server.id}
				/>
			</Suspense>
			<div className="flex w-full justify-center py-2 md:hidden">
				{selectedChannel && (
					<ChannelDropdown
						channels={channels}
						selectedChannel={selectedChannel}
						tenant={tenant}
					/>
				)}
			</div>
			<div className="flex flex-row pt-4">
				<div className="hidden md:block">
					{selectedChannel && (
						<ChannelSidebar
							channels={channels}
							tenant={tenant}
							selectedChannel={selectedChannel}
						/>
					)}
				</div>
				<MessagesSection />
			</div>
		</>
	);

	return (
		<div className="mx-auto w-full overflow-y-auto overflow-x-hidden bg-background">
			<Navbar tenant={tenant} hideIcon={!!tenant} />
			<TrackLoad
				eventName={'Community Page View'}
				eventData={serverToAnalyticsData(server)}
			/>
			<main className="mt-8 bg-background">
				<HeroArea />
				<div className="py-8">
					<div className="px-4 2xl:px-[6rem]">
						<CommunityQuestionsSection />
					</div>
				</div>
			</main>
			<Footer tenant={tenant} />
		</div>
	);
};
