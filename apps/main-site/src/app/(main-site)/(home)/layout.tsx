import { Metadata } from 'next';
import { LinkButton } from '@answeroverflow/ui/src/ui/link-button';
import { Footer } from '@answeroverflow/ui/src/footer';
import { Navbar } from '@answeroverflow/ui/src/navbar';
import { FaArrowTrendUp } from 'react-icons/fa6';
import { PiPlant } from 'react-icons/pi';
import { getPopularServers } from '@answeroverflow/analytics/src/query';
import { TrendingServer } from './components';
import { BlueLink } from '@answeroverflow/ui/src/ui/blue-link';
import { MdOutlineExplore } from 'react-icons/md';

export const metadata: Metadata = {
	alternates: {
		canonical: '/',
	},
};

export default async function HomePage(props: { children: React.ReactNode }) {
	const popularServers = await getPopularServers().then((x) =>
		Object.keys(x).slice(0, 10),
	);
	return (
		<div className="flex w-full flex-col bg-background font-body">
			<div className={'w-full max-w-screen-3xl'}>
				<Navbar tenant={undefined} />
			</div>
			<div className={'mx-auto flex flex-col py-4 2xl:flex-row'}>
				<div
					className={
						'2xl:mr-4 flex h-fit max-w-[650px] flex-col gap-4 p-4 text-center  2xl:w-[400px] 2xl:text-left'
					}
				>
					<div className={'text-sm font-bold text-white'}>
						Welcome to Answer Overflow!
					</div>
					<span>
						Answer Overflow is the best way to discover Discord content. Browse
						trending forum posts, explore popular servers, or view new content.
						Know of a Discord server that should show up on the site?{' '}
						<BlueLink href={'/about'}>
							Learn more about adding a server!
						</BlueLink>
					</span>
				</div>
				<div className={' flex w-[95vw] max-w-[650px] flex-col gap-4 md:px-4'}>
					<div className={'flex gap-4'}>
						<LinkButton
							className={'flex items-center gap-4'}
							href={'/'}
							selectedVariant={'secondary'}
							variant={'outline'}
						>
							<FaArrowTrendUp className={'size-4'} />
							<span className={'text-sm'}>Trending past 30 days</span>
						</LinkButton>
						<LinkButton
							className={'flex items-center gap-4'}
							href={'/new'}
							selectedVariant={'secondary'}
							variant={'outline'}
						>
							<PiPlant className={'size-4'} />
							<span className={'text-sm'}>New</span>
						</LinkButton>
					</div>
					{props.children}
				</div>
				<div
					className={'mr-4 hidden h-fit w-[400px] flex-col gap-4 p-4 2xl:flex'}
				>
					<div className={'text-sm font-bold text-white'}>Popular Servers</div>
					{popularServers.map((x) => (
						<TrendingServer serverId={x} key={x} />
					))}
					<LinkButton
						href={`/browse`}
						variant={'outline'}
						className={'flex w-full flex-row justify-between gap-2 bg-card'}
					>
						<div className={'flex items-center gap-2'}>
							<MdOutlineExplore className={'size-6'} />
							<span>Explore all communities</span>
						</div>
					</LinkButton>
				</div>
			</div>
			<Footer tenant={undefined} />
		</div>
	);
}
