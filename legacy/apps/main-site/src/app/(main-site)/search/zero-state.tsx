import { fetchBrowseServers } from '../../../data/browse';
import { FollowCursor } from '@answeroverflow/ui/src/ui/follow';
import { LinkButton } from '@answeroverflow/ui/src/ui/link-button';
import { MessagesSearchBar } from '@answeroverflow/ui/src/messages-search-bar';
import { ServerIcon } from '@answeroverflow/ui/src/server-icon';
import Link from '@answeroverflow/ui/src/ui/link';
import Marquee from 'react-fast-marquee';
import { Suspense } from 'react';
import type { ServerPublic } from '@answeroverflow/api';
import { Navbar } from '@answeroverflow/ui/src/navbar';
import { Footer } from '@answeroverflow/ui/src/footer';

const HeroAreaText = () => {
	return (
		<div className="flex h-full w-[calc(100vw-2rem)] max-w-screen-lg flex-col items-center justify-center gap-6 rounded-3xl border-2 border-solid border-primary/[.6] bg-background/[.4] bg-clip-padding px-4 py-8 backdrop-blur-3xl sm:w-[80vw] sm:p-8 md:p-16">
			<h1 className="text-center font-header text-5xl font-bold leading-[114.5%] text-primary md:text-7xl">
				Search all of Discord
			</h1>
			<div className="flex w-full flex-col items-center justify-center gap-8 sm:hidden sm:flex-row">
				<Suspense>
					<MessagesSearchBar />
				</Suspense>
			</div>
			<h2 className="text-center font-body text-lg text-primary/[.95] sm:w-4/5 md:text-2xl">
				Answer Overflow is a Discord search engine. Find results from indexed
				content or a community to join.
			</h2>
			<div className="hidden w-full flex-col items-center justify-center gap-8 sm:flex sm:flex-row">
				<Suspense>
					<MessagesSearchBar />
				</Suspense>
			</div>
			<div className="grid w-full grid-cols-1 grid-rows-2 gap-4 sm:w-auto sm:grid-cols-2 sm:grid-rows-1 sm:gap-8">
				<LinkButton
					size={'lg'}
					className={'w-full text-xl'}
					href={'/search?q=nextjs+trpc+app+router'}
				>
					Try a search
				</LinkButton>
				<LinkButton
					size={'lg'}
					variant={'outline'}
					href={'/onboarding'}
					className={'w-full text-xl'}
				>
					Add your server
				</LinkButton>
			</div>
		</div>
	);
};

const ServerGrid = (props: {
	servers: Pick<ServerPublic, 'id' | 'icon' | 'name'>[];
}) => {
	return (
		<Marquee speed={20}>
			<div
				className={
					'my-auto mr-8 grid min-h-[calc(100vh-5rem)] grid-flow-col grid-rows-5 gap-8 py-4 md:grid-rows-4 md:gap-16'
				}
			>
				{props.servers.map((server) => {
					return (
						<Link
							className={
								'flex items-center blur-sm brightness-[80%] transition-all duration-1000 hover:blur-none hover:brightness-100 hover:duration-300 dark:brightness-50 dark:hover:brightness-100'
							}
							href={`/c/${server.id}`}
							key={server.id}
							tabIndex={-1}
						>
							<ServerIcon
								server={server}
								size={160}
								className={
									'max-h-[92px] max-w-[92px] md:max-h-full md:max-w-full'
								}
							/>
						</Link>
					);
				})}
			</div>
		</Marquee>
	);
};

const HeroArea = (props: {
	servers: Pick<ServerPublic, 'id' | 'icon' | 'name'>[];
}) => {
	return (
		<div className="relative min-h-[calc(100vh-5rem)] w-full">
			<ServerGrid servers={props.servers} />
			<div className="pointer-events-none absolute right-0 top-0 z-10 hidden h-full w-52 bg-gradient-to-l from-[rgba(245,248,255,.5)] to-[rgba(245,248,255,0)] dark:from-[rgba(6,6,7,1)] dark:to-[rgba(6_,6_,7_,0_)] sm:block" />
			<div className="pointer-events-none absolute left-0 top-0 z-10 hidden h-full w-52 bg-gradient-to-r from-[rgba(245,248,255,.5)] to-[rgba(245,248,255,0)] dark:from-[rgba(6,6,7,1)] dark:to-[rgba(6_,6_,7_,0_)] sm:block" />
			<div className="absolute left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2">
				<HeroAreaText />
			</div>
		</div>
	);
};

export async function ZeroState() {
	const data = await fetchBrowseServers();
	return (
		<div className="flex w-full flex-col items-center bg-background font-body">
			<Navbar tenant={undefined} />
			<HeroArea servers={data} />
			<div
				className={
					'grid w-full max-w-screen-3xl grid-cols-1 grid-rows-1 gap-8 p-8 text-center md:grid-cols-3'
				}
			>
				<FollowCursor intensity={40}>
					<div
						className={
							'flex h-full flex-col justify-between rounded-2xl border-2 border-primary/[.1] p-8 text-center drop-shadow-xl'
						}
					>
						<h2 className={'mb-8 text-2xl'}>Browse All Communities</h2>
						<span className={'text-lg'}>
							Browse the hundreds of communities using Answer Overflow to make
							their content more accessible.
						</span>
						<LinkButton
							href={'/browse'}
							className={'mx-auto mt-8'}
							variant={'outline'}
						>
							Browse
						</LinkButton>
					</div>
				</FollowCursor>
				<FollowCursor intensity={40}>
					<div
						className={
							'flex h-full flex-col justify-between rounded-2xl border-2 border-primary/[.1] p-8 text-center drop-shadow-xl'
						}
					>
						<h2 className={'mb-8 text-2xl'}>Setup for free</h2>
						<span className={'text-lg'}>
							Answer Overflow is free to use and setup for your community to
							start getting your Discord discussions indexed.
						</span>
						<LinkButton
							href={'/about'}
							className={'mx-auto mt-8'}
							prefetch={false}
						>
							Learn More
						</LinkButton>
					</div>
				</FollowCursor>
				<FollowCursor intensity={40}>
					<div
						className={
							'flex h-full flex-col justify-between rounded-2xl border-2 border-primary/[.1] p-8 text-center drop-shadow-xl'
						}
					>
						<h2 className={'mb-8 text-2xl'}>Open Source</h2>
						<span className={'text-lg'}>
							Answer Overflow is open source and FSL MIT licensed, our goal is
							to make finding Discord content available to everyone.
						</span>
						<LinkButton
							href={'https://github.com/AnswerOverflow/AnswerOverflow/'}
							className={'mx-auto mt-8'}
							variant={'outline'}
						>
							Star on GitHub
						</LinkButton>
					</div>
				</FollowCursor>
			</div>
			<Footer tenant={undefined} />
		</div>
	);
}
