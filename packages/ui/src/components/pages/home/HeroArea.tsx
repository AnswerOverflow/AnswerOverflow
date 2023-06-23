import { useEffect, useState } from 'react';
import Marquee from 'react-fast-marquee';
import type { ServerPublic } from '~api/router/server/types';
import { SearchInput } from '~ui/components/primitives';

const HeroAreaText = () => {
	return (
		<div className="flex w-full flex-col items-start justify-center gap-6 pb-20 xl:w-[40%]">
			<h1 className="text-center font-header text-4xl font-bold leading-[114.5%] text-ao-black dark:text-ao-white md:text-start md:text-6xl">
				Search All Of Discord
			</h1>
			<p className="w-4/5 text-center font-body text-lg text-ao-black/[.95] dark:text-ao-white/[.85] md:text-start md:text-xl">
				Answer Overflow is an open source project designed to bring discord
				channels to your favorite search engine, enabling users to easily find
				the info they need, fast.
			</p>
			<div className="flex w-full flex-col items-center justify-center gap-8 sm:flex-row">
				<SearchInput />
			</div>
		</div>
	);
};

const ServerGrid = (props: { servers: ServerPublic[] }) => {
	const [serverColumnsState, setServerColumnsState] =
		useState<ServerPublic[][]>();

	useEffect(() => {
		// 8 columns
		const columns: ServerPublic[][] = [[], [], [], [], [], [], [], []];
		props.servers.forEach((server, index) => {
			// 4 in each column, 8 columns
			const column = index % 8;
			columns[column]?.push(server);
		});
		setServerColumnsState(columns);
	}, [props.servers]);

	console.log(serverColumnsState);

	const EachColumn = (props: { servers: ServerPublic[] }) => {
		return (
			<div className="mx-4 grid grid-cols-1 grid-rows-4 gap-y-6">
				{props.servers.map((server) => {
					return (
						<div
							key={`server-${server.id}`}
							className="flex h-8 w-36 items-center justify-center rounded-standard border-2 border-ao-white/25 bg-ao-white/5 p-6"
						>
							{server.name}
						</div>
					);
				})}
			</div>
		);
	};

	return (
		<Marquee className="grid" speed={50} pauseOnHover>
			{serverColumnsState?.map((column, index) => {
				return <EachColumn key={`column-${index}`} servers={column} />;
			})}
		</Marquee>
	);
};

export const HeroArea = (props: { servers: ServerPublic[] }) => {
	return (
		<div className="z-20 flex min-h-[calc(100vh-10rem)] items-center px-4 pb-20 pt-10 sm:px-[4rem] 2xl:px-[6rem]">
			<div className="flex h-full w-full flex-col transition-all lg:gap-32 xl:flex-row 2xl:gap-72">
				<HeroAreaText />
				<div className="hidden items-center justify-center sm:flex 2xl:grow">
					<ServerGrid servers={props.servers} />
				</div>
			</div>
		</div>
	);
};
