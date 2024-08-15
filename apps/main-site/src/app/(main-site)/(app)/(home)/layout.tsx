import { Metadata } from 'next';
import { LinkButton } from '@answeroverflow/ui/src/ui/link-button';
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
	const popularServers =
		(await getPopularServers()?.then((res) => Object.keys(res ?? {}))) ?? [];
	const popularServersWithPubg = [
		...new Set([
			...popularServers.slice(0, 1),
			'393088095840370689',
			...popularServers.slice(1, 10),
		]),
	];
	return (
		<div
			className={
				'flex w-full flex-col items-center pt-2 2xl:flex-row 2xl:items-start'
			}
		>
			<div
				className={
					'hidden h-fit max-w-[650px] flex-col gap-4 p-4 text-center md:flex 2xl:mr-4 2xl:w-[400px] 2xl:text-left'
				}
			>
				<div className={'text-sm font-bold text-primary'}>
					Welcome to Answer Overflow!
				</div>
				<span>
					Answer Overflow is the best way to discover Discord content. Browse
					trending forum posts, explore popular servers, or view new content.
					Know of a Discord server that should show up on the site?{' '}
					<BlueLink href={'/about'} prefetch={false}>
						Learn more about adding a server!
					</BlueLink>
				</span>
			</div>
			<div className={'flex w-[95vw] max-w-[650px] flex-col gap-4 md:px-4'}>
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
				{popularServersWithPubg.map((x) => (
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
	);
}
