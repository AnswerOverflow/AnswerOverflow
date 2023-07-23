import Marquee from 'react-fast-marquee';
import type { ServerPublic } from '~api/router/server/types';
import { Button, SearchInput, ServerIcon } from '~ui/components/primitives';

const HeroAreaText = () => {
	return (
		<div className="flex h-full w-full flex-col items-center justify-center gap-6 rounded-3xl bg-gray-900/40 bg-clip-padding p-16 backdrop-blur-3xl">
			<h1 className="text-center font-header text-4xl font-bold leading-[114.5%] text-ao-black dark:text-ao-white md:text-start md:text-6xl">
				Search all of Discord
			</h1>
			<p className="w-4/5 text-center font-body text-lg text-ao-black/[.95] dark:text-ao-white/[.85] md:text-start md:text-xl">
				Answer Overflow is a Discord search engine. Find results from indexed
				content or a community to join.
			</p>
			<div className="flex w-full flex-col items-center justify-center gap-8 sm:flex-row">
				<SearchInput className={'bg-neutral-900'} />
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
	return (
		<Marquee speed={10}>
			<div className={'grid max-w-vw40 grid-flow-col grid-rows-4 gap-16'}>
				{props.servers.map((server) => {
					return <ServerIcon server={server} size={160} key={server.id} />;
				})}
			</div>
		</Marquee>
	);
};

export const HeroArea = (props: { servers: ServerPublic[] }) => {
	return (
		<div className="relative mt-32 min-h-[calc(100vh-10rem)] w-full">
			<div className="blur-sm">
				<ServerGrid servers={props.servers} />
				<div
					className="absolute right-0 top-0 z-10 h-full w-1/4"
					style={{
						// from right to left, fade from 0 to 1 opacity
						background:
							'linear-gradient(to right, rgba(6, 6, 7, 0), rgba(6, 6, 7, 1))',
					}}
				/>
				<div
					className="absolute left-0 top-0 z-10 h-full w-1/4"
					style={{
						background:
							'linear-gradient(to right, rgba(6, 6, 7, 1), rgba(6, 6, 7, 0))',
					}}
				/>
			</div>
			<div
				className="fixed z-20 m-auto transition-all "
				style={{
					top: '50%',
					left: '50%',
					transform: 'translate(-50%, -50%)',
				}}
			>
				<HeroAreaText />
			</div>
		</div>
	);
};
