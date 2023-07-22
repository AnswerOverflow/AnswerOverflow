import { useEffect, useState } from 'react';
import Marquee from 'react-fast-marquee';
import type { ServerPublic } from '~api/router/server/types';
import {
	Button,
	Paragraph,
	SearchInput,
	ServerIcon,
} from '~ui/components/primitives';
import { trackEvent } from '@answeroverflow/hooks';
import { serverToAnalyticsData } from '@answeroverflow/constants';
import Image from 'next/image';
import Link from 'next/link';

const HeroAreaText = () => {
	return (
		<div className="flex h-full w-full flex-col items-start justify-center gap-6 rounded-md bg-gray-900/40 bg-clip-padding p-16 backdrop-blur-lg">
			<h1 className="text-center font-header text-4xl font-bold leading-[114.5%] text-ao-black dark:text-ao-white md:text-start md:text-6xl">
				Search All Of Discord
			</h1>
			<p className="w-4/5 text-center font-body text-lg text-ao-black/[.95] dark:text-ao-white/[.85] md:text-start md:text-xl">
				A search engine for all public Discord servers. Find results from
				indexed content or find a community to join.
			</p>
			<div className="flex w-full flex-col items-center justify-center gap-8 sm:flex-row">
				<SearchInput />
			</div>
			<div className="flex flex-row gap-4">
				<Button size={'lg'} className={'text-xl'}>
					Try a search
				</Button>
				<Button size={'lg'} variant={'outline'} className={'text-xl'}>
					Add your server
				</Button>
			</div>
		</div>
	);
};

const ServerGrid = (props: { servers: ServerPublic[] }) => {
	const [serverColumnsState, setServerColumnsState] =
		useState<ServerPublic[][]>();

	useEffect(() => {
		// 8 columns
		const numCols = 5;
		const columns: ServerPublic[][] = Array.from({ length: numCols }, () => []);
		props.servers.forEach((server, index) => {
			// 4 in each column, 8 columns
			const column = index % numCols;
			columns[column]?.push(server);
		});
		setServerColumnsState(columns);
	}, [props.servers]);

	console.log(serverColumnsState);

	const EachColumn = (props: {
		servers: ServerPublic[];
		direction: 'left' | 'right';
		delay?: number;
	}) => {
		return (
			<Marquee
				gradient
				gradientColor={[6, 6, 7]}
				speed={20}
				direction={props.direction}
				delay={props.delay ?? 0}
				pauseOnHover
				className="flex h-full flex-col justify-center"
			>
				<div className={'my-4 flex flex-row justify-between'}>
					{props.servers.map((server) => {
						return (
							<Link
								key={`${server.id}-${props.direction}`}
								href={`c/${server.id}`}
								style={{
									width: '80%',
								}}
							>
								<div className="z-50 flex flex-col items-center transition-all duration-200 hover:z-10 hover:scale-110 hover:shadow-lg ">
									<ServerIcon
										server={server}
										className={'mx-2'}
										size={150}
										key={`${server.id}-${props.direction}`}
									/>
								</div>
							</Link>
						);
					})}
				</div>
			</Marquee>
		);
	};

	return (
		<div className="grid grid-cols-1 grid-rows-4 ">
			{serverColumnsState?.map((column, index) => {
				return (
					<EachColumn
						key={`column-${index}`}
						servers={column}
						direction={'left'}
						delay={index * -1}
					/>
				);
			})}
		</div>
	);
};

export const HeroArea = (props: { servers: ServerPublic[] }) => {
	return (
		<div className="relative flex min-h-[calc(100vh-10rem)] items-center px-4 pb-20 pt-10 sm:px-[4rem] 2xl:px-[6rem]">
			<div className="z-20 grid h-full grid-cols-2 transition-all lg:gap-32 xl:flex-row 2xl:gap-72">
				<HeroAreaText />
			</div>
			<div className="absolute right-0 top-20 -z-0 hidden max-w-vw80 items-center justify-center blur-sm sm:flex">
				<ServerGrid servers={props.servers} />
			</div>
		</div>
	);
};
