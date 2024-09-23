import { Heading } from '../../ui/heading';
import Balancer from 'react-wrap-balancer';
import Image from 'next/image';
import { serverToAnalyticsData } from '@answeroverflow/constants';
import { TrackLink } from '../../ui/track-link';
import { Paragraph } from '../../ui/paragraph';
import { LinkButton } from '../../ui/link-button';
import { cn } from '../../utils/utils';

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
			<div className="flex flex-col items-center transition-all duration-200 hover:z-10 hover:scale-110 hover:shadow-lg">
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
export const FeaturedCommunitiesSection = (props: { className?: string }) => {
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
