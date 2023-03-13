import type { APISearchResult } from '@answeroverflow/api';
import {
	Message,
	MessageContents,
	MessageImages,
	MessageRenderer,
	MessageTitle,
} from '~ui/components/primitives/Message';
import { Button } from '../primitives/Button';
import { createContext, useContext } from 'react';
import { useTheme } from '~ui/utils/hooks';

// eslint-disable-next-line @typescript-eslint/naming-convention
const SearchResultContext = createContext<{
	result: APISearchResult[number];
} | null>(null);

export function useSearchResultContext() {
	const context = useContext(SearchResultContext);
	if (!context) {
		throw new Error(
			'This component must be rendered as a child of Search component',
		);
	}
	return context;
}

const ServerInviteTitle = ({ name }: { name: string }) => {
	return (
		<h3 className="pt-2 text-center font-header text-2xl font-bold text-ao-black dark:text-ao-white">
			{name}
		</h3>
	);
};

const ServerInviteChannelName = ({ channelName }: { channelName: string }) => {
	return (
		<h5 className="text-center text-xl font-light text-ao-black/[.9] dark:text-ao-white/[.9]">
			#{channelName}
		</h5>
	);
};

const ServerInviteIcon = () => {
	return (
		<div className="h-24 w-24 rounded-[50%] border-2 border-white bg-[#F6F9FF] dark:bg-[#9A9A9A]" />
	);
};

const ServerInviteJoinButton = () => {
	const theme = useTheme();
	return (
		<>
			{theme === 'dark' ? (
				<Button type={'solid'} color={'white'} className="my-4">
					Join Server
				</Button>
			) : (
				<Button type={'solid'} color={'black'} className="my-4">
					Join Server
				</Button>
			)}
		</>
	);
};

const ThreadIcon = () => {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth={1.5}
			stroke="currentColor"
			className="h-6 w-6 text-ao-black/[.55] dark:text-ao-white/[.55]"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
			/>
		</svg>
	);
};

const ViewsIcon = () => {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth={1.5}
			stroke="currentColor"
			className="h-6 w-6 text-ao-black/[.55] dark:text-ao-white/[.55]"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
			/>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
			/>
		</svg>
	);
};

// TODO: Use data from the API
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SearchResultMetaData = () => {
	return (
		<div className="mt-2 flex flex-row items-center justify-center">
			{/* Thread count */}
			<span className="flex items-center justify-center px-1 text-ao-black/[.55] dark:text-ao-white/[.55]">
				{0}
			</span>
			<ThreadIcon />

			<div
				className="ml-2 h-2 w-2 rounded-[50%] bg-ao-black/[.55] dark:bg-ao-white/[.55]"
				aria-hidden
			/>

			{/* Views */}
			<span className="px-1 text-ao-black/[.55] dark:text-ao-white/[.55]">
				{0}
			</span>
			<ViewsIcon />
		</div>
	);
};

export const SearchResult = () => {
	const { result } = useSearchResultContext();
	const solution = result.message.solutionMessages?.[0];

	const SearchResultMainContent = () => (
		<div className="flex grow flex-col">
			{/* Body */}
			<Message
				message={result.message}
				messageRenderer={
					<MessageRenderer
						showBorders
						content={
							<>
								<MessageTitle channel={result.channel} thread={result.thread} />
								<MessageContents />
								<MessageImages />
							</>
						}
					/>
				}
			/>

			{/* Answer */}
			{solution && (
				<div className="rounded-b-standard border-2 border-ao-green  bg-ao-green/10 dark:bg-ao-green/[0.02] lg:rounded-br-none">
					<Message message={solution} />
				</div>
			)}
		</div>
	);

	const SearchResultSidebar = () => {
		return (
			<div className="hidden w-1/4 flex-col items-center justify-center rounded-tr-standard rounded-br-standard border-y-2 border-r-2 border-black/[.13] px-5 pt-6 pb-2 dark:border-white/[.13] lg:flex">
				{/* Server Invite */}
				<div className="flex flex-col items-center justify-center pt-6 pb-2 xl:px-5">
					<ServerInviteIcon />
					<ServerInviteTitle name={result.server.name} />
					{result.channel && (
						<>
							<ServerInviteChannelName channelName={result.channel.name} />
							<ServerInviteJoinButton />
						</>
					)}
				</div>
				<SearchResultMetaData />
			</div>
		);
	};

	return (
		<div className="flex h-full w-full flex-col rounded-standard bg-[#E9ECF2] dark:bg-[#181B1F] lg:flex-row">
			<SearchResultMainContent />
			<SearchResultSidebar />
		</div>
	);
};

export const SearchResultWrapper = ({
	result,
}: {
	result: APISearchResult[number];
}) => {
	return (
		<SearchResultContext.Provider value={{ result }}>
			<SearchResult />
		</SearchResultContext.Provider>
	);
};
