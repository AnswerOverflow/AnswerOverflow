import { Metadata } from 'next';
import { metadata as baseMetadata } from '../layout';

import { Footer } from '@answeroverflow/ui/footer';
import { Navbar } from '@answeroverflow/ui/navbar/index';
import { PricingOptions } from '@answeroverflow/ui/pricing';
import { HowDoesItWorkArea } from '../_components/HowDoesItWorkArea';

import { FeaturedCommunitiesSection } from '@answeroverflow/ui/pages/home/FeaturedCommunities';
import { FeaturesSection } from '@answeroverflow/ui/pages/home/Features';
import { Heading } from '@answeroverflow/ui/heading';
import { Paragraph } from '@answeroverflow/ui/paragraph';
import { LinkButton } from '@answeroverflow/ui/link-button';
import Balancer from 'react-wrap-balancer';

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
				<div className="mt-20 w-full text-center">
					<Heading.H2>
						<Balancer>What Our Users Say</Balancer>
					</Heading.H2>
					<Heading.H3 className="pt-4 text-lg">
						<Balancer>
							See how Answer Overflow is helping communities make their Discord
							content discoverable
						</Balancer>
					</Heading.H3>
					<div className="mt-8 flex flex-col items-center gap-4">
						<Paragraph className="text-lg">
							&quot;Answer Overflow is great! It makes Discord content searchable
							and discoverable on the web.&quot;
						</Paragraph>
						<LinkButton
							href="https://x.com/cramforce/status/1985828556019020031"
							variant="outline"
							target="_blank"
							rel="noopener noreferrer"
						>
							View Tweet
						</LinkButton>
					</div>
				</div>
				<div className={'mt-20 w-full'}>
					<PricingOptions />
				</div>
				<FeaturedCommunitiesSection className="pt-20" />
			</div>
			<Footer tenant={undefined} />
		</div>
	);
}
