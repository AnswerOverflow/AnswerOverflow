import { metadata as baseMetadata } from '../../layout';
import { Metadata } from 'next';

import Balancer from 'react-wrap-balancer';
import Image from 'next/image';
import { cn } from '@answeroverflow/ui/src/utils/utils';
import { serverToAnalyticsData } from '@answeroverflow/constants/src/analytics';
import { Paragraph } from '@answeroverflow/ui/src/components/primitives/ui/paragraph';
import { Heading } from '@answeroverflow/ui/src/components/primitives/ui/heading';
import { LinkButton } from '@answeroverflow/ui/src/components/primitives/ui/link-button';
import { HowDoesItWorkArea } from './_components/HowDoesItWorkArea';
import { Footer } from '@answeroverflow/ui/src/components/primitives/footer';
import { PricingOptions } from '@answeroverflow/ui/src/components/primitives/pricing';
import { TrackLink } from '@answeroverflow/ui/src/components/primitives/ui/track-link';
import { Navbar } from '@answeroverflow/ui/src/components/primitives/navbar';

// TODO: Link to docs for feature?
const HomeFeature = (props: {
	featureName: React.ReactNode;
	featureDescription?: React.ReactNode;
}) => {
	return (
		<div className="flex flex-col items-center justify-center rounded-standard border-2 border-gray-300  px-2 py-4 text-center dark:border-white/[.13] md:px-20 md:py-10 ">
			<Paragraph className="text-xl md:text-2xl">{props.featureName}</Paragraph>
			<Paragraph className="text-lg">{props.featureDescription}</Paragraph>
		</div>
	);
};

const FeaturesSection = (props: { className?: string }) => {
	return (
		<div className={cn('w-full', props.className)}>
			<Heading.H2 className="text-center md:text-right">
				Tools tailored to your community
			</Heading.H2>
			<Heading.H3 className="pt-0 text-center text-lg md:text-right">
				<Balancer>
					Your community is unique, {"it's"} time you had a bot that matches it
				</Balancer>
			</Heading.H3>

			<div className="mt-2 grid grid-cols-1 grid-rows-1 gap-10 md:grid-cols-2 md:grid-rows-2">
				<HomeFeature
					featureName="🔎 Index Content Into Google"
					featureDescription="Organically gain more users by ranking at the top of Google search results"
				/>
				<HomeFeature
					featureName="🤖 AI Question Answers"
					featureDescription={
						<>
							<b>Automate answering repeat questions</b>, with AI answers
							sourced from your community content.
						</>
					}
				/>
				<HomeFeature
					featureName="📈 Community Insights"
					featureDescription="Understand what your community is asking the most about and where to improve your documentation"
				/>
				<HomeFeature
					featureName="💻 Host On Your Own Domain"
					featureDescription="Boost your website with organic content generated by your community"
				/>
			</div>
		</div>
	);
};

type FeaturedCommunityProps = {
	id: string;
	name: string;
	iconUrl: string;
	approximateMemberCount: string;
};

const featuredCommunities: FeaturedCommunityProps[] = [
	{
		name: 'Reactiflux',
		id: '102860784329052160',
		iconUrl: '/featured-communities/reactiflux_logo.png',
		approximateMemberCount: '200,000+',
	},
	{
		name: 'C#',
		id: '143867839282020352',
		iconUrl: '/featured-communities/csharp_logo.png',
		approximateMemberCount: '45,000+',
	},
	{
		name: 'MechaKeys',
		id: '462274708499595264',
		approximateMemberCount: '45,000+',
		iconUrl: '/featured-communities/mecha_keys_logo.png',
	},
	{
		name: "Theo's Typesafe Cult",
		id: '966627436387266600',
		approximateMemberCount: '15,000+',
		iconUrl: '/featured-communities/theos_typesafe_cult_logo.png',
	},
	{
		name: 'tRPC',
		id: '867764511159091230',
		iconUrl: '/featured-communities/trpc_logo.png',
		approximateMemberCount: '15,000+',
	},
	{
		name: 'Vue Storefront',
		id: '770285988244750366',
		approximateMemberCount: '4,000+',
		iconUrl: '/featured-communities/vue_storefront_logo.png',
	},
	{
		name: 'Sapphire',
		id: '737141877803057244',
		iconUrl: '/featured-communities/sapphire_logo.png',
		approximateMemberCount: '2,000+',
	},
	{
		name: 'FIFA Live Editor',
		id: '701008832645824553',
		iconUrl: '/featured-communities/fifa_live_editor_logo.png',
		approximateMemberCount: '5,000+',
	},
	{
		name: 'Twill',
		id: '811936425858695198',
		iconUrl: '/featured-communities/twill_logo.png',
		approximateMemberCount: '1,000+',
	},
	{
		name: 'Drizzle Team',
		id: '1043890932593987624',
		approximateMemberCount: '1,000+',
		iconUrl: '/featured-communities/drizzle_logo.png',
	},
	{
		name: 'Apache TinkerPop',
		id: '838910279550238720',
		iconUrl: '/featured-communities/apache_tinkerpop_logo.png',
		approximateMemberCount: '1,000+',
	},
	{
		name: 'Mudlet',
		id: '283581582550237184',
		iconUrl: '/featured-communities/mudlet_logo.png',
		approximateMemberCount: '5,000+',
	},
];

const FeaturedCommunity = (props: FeaturedCommunityProps) => {
	return (
		<TrackLink
			href={`c/${props.id}`}
			style={{
				width: '80%',
			}}
			eventName={'Community Page Link Click'}
			eventData={{
				'Link Location': 'About Marquee',
				...serverToAnalyticsData(props),
			}}
		>
			<div
				className="flex
      flex-col items-center transition-all duration-200
      hover:z-10 hover:scale-110 hover:shadow-lg
      "
			>
				<Image
					src={props.iconUrl}
					width={92}
					height={92}
					unoptimized
					alt={`${props.name} community icon`}
					className="rounded-full"
				/>

				<Paragraph className="py-2 text-center text-lg">{props.name}</Paragraph>
			</div>
		</TrackLink>
	);
};

// TODO: The marquee is really hacky here to get sizing right on all devices
const FeaturedCommunitiesSection = (props: { className?: string }) => {
	return (
		<div className={cn('overflow-x-hidden text-center', props.className)}>
			<Heading.H2>
				<Balancer>Serving 2+ million users across 300 servers</Balancer>
			</Heading.H2>
			<div className="grid grid-cols-2 gap-8 py-8 sm:grid-cols-4">
				{featuredCommunities.map((community) => (
					<div key={community.id} className="my-0">
						<FeaturedCommunity {...community} />
					</div>
				))}
			</div>
			<LinkButton href="/browse">View All Communities</LinkButton>
		</div>
	);
};

export const metadata: Metadata = {
	title: 'Index Your Discord Content Into Google - Answer Overflow',
	description:
		'Learn about how you can index Discord channels into Google search results with Answer Overflow.',
	openGraph: {
		...baseMetadata.openGraph,
		title: 'Index Your Discord Content Into Google - Answer Overflow',
		description:
			'Learn about how you can index Discord channels into Google search results with Answer Overflow.',
	},
};
export default function Page() {
	return (
		<div className={'mx-auto max-w-screen-3xl'}>
			<Navbar tenant={undefined} />

			<HowDoesItWorkArea />
			<div className="flex flex-col items-center px-4 pb-20 pt-10 sm:px-[4rem] 2xl:px-[6rem]">
				<FeaturesSection />
				<div className={'mt-20 w-full'}>
					<PricingOptions />
				</div>
				<FeaturedCommunitiesSection className="pt-20" />
			</div>
			<Footer tenant={undefined} />
		</div>
	);
}