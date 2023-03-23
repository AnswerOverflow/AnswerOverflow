import type {
	ChannelPublicWithFlags,
	CommunityPageData,
} from '@answeroverflow/db';
import { useState } from 'react';
import { Footer } from '../Footer';
import { Message } from '../primitives';
import { Button } from '../primitives/Button';
import { Heading } from '../primitives/Heading';
import { Navbar } from '../primitives/Navbar';
import { MessagesSearchBar } from '../search/SearchPage';
import { ServerIcon } from '../ServerIcon';
import {
	ChannelName,
	ServerInvite,
	ServerInviteJoinButton,
} from '../ServerInvite';

function ChannelSidebar(props: {
	channels: ChannelPublicWithFlags[];
	selectedChannelId: string | null;
	setSelectedChannelId: (id: string) => void;
}) {
	const ChannelSelect = ({ channel }: { channel: ChannelPublicWithFlags }) => {
		const selected = props.selectedChannelId === channel.id;
		return (
			<Button
				className={selected ? '' : 'bg-inherit dark:bg-inherit'}
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
		<div className="mr-4">
			<Heading.H4>Channels</Heading.H4>
			<div className="flex flex-col gap-2">
				{channels.map((channel) => (
					<ChannelSelect channel={channel} key={channel.id} />
				))}
			</div>
		</div>
	);
}

export const CommunityPage = ({ server, channels }: CommunityPageData) => {
	const [selectedChannelId, setSelectedChannelId] = useState<null | string>(
		channels.at(0)?.channel.id ?? null,
	);

	const selectedChannel = channels.find(
		(c) => c.channel.id === selectedChannelId,
	);

	const questions = selectedChannel?.questions ?? null;

	return (
		<div className="mx-auto w-full overflow-y-scroll bg-ao-white scrollbar-hide overflow-x-hidden dark:bg-ao-black">
			<Navbar />
			<main className="bg-ao-white dark:bg-ao-black">
				<div className="flex flex-col">
					<div className="my-auto flex flex-row bg-gradient-to-r from-[#7196CD] to-[#82adbe] px-4 py-8 dark:to-[#113360] sm:px-8 xl:px-[7rem] xl:py-16 2xl:py-20">
						<ServerInvite
							server={server}
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
									<div className="ml-16 flex flex-col">
										<Heading.H1 className="pt-0">{server.name}</Heading.H1>
										<Heading.H2 className="text-xl font-normal">
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

				<div className="py-8 sm:px-4">
					<div className="px-4 2xl:px-[6rem]">
						<MessagesSearchBar
							placeholder={`Search the ${server.name} community`}
							serverId={server.id}
						/>

						<Heading.H3 className="py-0">Community questions</Heading.H3>
						<div className="flex shrink-0 flex-row ">
							<ChannelSidebar
								channels={channels.map((c) => c.channel)}
								selectedChannelId={selectedChannelId}
								setSelectedChannelId={setSelectedChannelId}
							/>
							<div className="flex w-full flex-1 flex-col gap-2">
								{questions ? (
									questions.map((question) => (
										<div className="drop-shadow-sm " key={question.message.id}>
											<Message message={question.message} />
										</div>
									))
								) : (
									<div className="flex flex-col items-center justify-center">
										<Heading.H4 className="text-center">
											No questions found for this channel.
										</Heading.H4>
										<Button className="mx-auto mt-2 w-fit px-10 text-lg sm:mx-0">
											Ask a question
										</Button>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</main>
			<Footer />
		</div>
	);
};
