import Marquee from 'react-fast-marquee';
import type { ServerPublic } from '~api/router/server/types';
import { Button, SearchInput, ServerIcon } from '~ui/components/primitives';
import Balancer from 'react-wrap-balancer';
import Link from 'next/link';

const HeroAreaText = () => {
	return (
		<div className="flex h-full w-[calc(100vw-2rem)] max-w-screen-lg flex-col items-center justify-center gap-6 rounded-3xl bg-gray-900/40 bg-clip-padding p-8 backdrop-blur-3xl sm:w-[80vw] md:p-16">
			<h1 className="text-center font-header text-5xl font-bold leading-[114.5%] text-ao-black dark:text-ao-white md:text-7xl">
				Search all of Discord
			</h1>
			<h2 className="w-4/5 text-center font-body text-lg text-ao-black/[.95] dark:text-ao-white/[.85] md:text-2xl">
				Answer Overflow is a Discord search engine. Find results from indexed
				content or a community to join.
			</h2>
			<div className="flex w-full flex-col items-center justify-center gap-8 sm:flex-row">
				<SearchInput />
			</div>
			<div className="grid w-full grid-cols-1 grid-rows-2 gap-4 sm:w-auto sm:grid-cols-2 sm:grid-rows-1  sm:gap-8">
				<Button size={'lg'} className={'w-full text-xl'}>
					Try a search
				</Button>
				<Button size={'lg'} variant={'outline'} className={'w-full  text-xl'}>
					Add your server
				</Button>
			</div>
		</div>
	);
};

const ServerGrid = (props: { servers: ServerPublic[] }) => {
	return (
		<Marquee speed={10}>
			<div
				className={
					'mr-8 grid min-h-[calc(100vh-10rem)] grid-flow-col grid-rows-6 gap-8 md:grid-rows-4 md:gap-16'
				}
			>
				{props.servers.map((server) => {
					return (
						<Link
							className={
								'max-h-[92px] max-w-[92px] blur-sm brightness-50 transition-all duration-500 ease-out hover:blur-none hover:brightness-100 md:max-h-full md:max-w-full'
							}
							href={`/c/${server.id}`}
							key={server.id}
						>
							<ServerIcon server={server} size={160} />
						</Link>
					);
				})}
			</div>
		</Marquee>
	);
};

export const HeroArea = (props: { servers: ServerPublic[] }) => {
	return (
		<div className="relative w-full">
			<ServerGrid servers={props.servers} />
			<div
				className="pointer-events-none absolute right-0 top-0 z-10 h-full w-1/4"
				style={{
					// from right to left, fade from 0 to 1 opacity
					background:
						'linear-gradient(to right, rgba(6, 6, 7, 0), rgba(6, 6, 7, 1))',
				}}
			/>
			<div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-1/4 bg-gradient-to-r from-[rgba(6,6,7,1)] to-[rgba(6_,6_,7_,0_)]" />
			<div className="absolute left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2">
				<HeroAreaText />
			</div>
		</div>
	);
};
