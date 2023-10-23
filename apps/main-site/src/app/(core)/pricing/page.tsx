import { Pricing } from '@answeroverflow/ui/src/components/pages/Pricing';
import { Metadata } from 'next';
export const metadata: Metadata = {
	title: 'Pricing - Answer Overflow',
	description:
		'Start indexing your Discord content into Google for free. Explore our public and enterprise platforms to find what suits you best',
	openGraph: {
		title: 'Pricing - Answer Overflow',
		description:
			'Start indexing your Discord content into Google for free. Explore our public and enterprise platforms to find what suits you best',
	},
};
export default function PricingPage() {
	return <Pricing />;
}
