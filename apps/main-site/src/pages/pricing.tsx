import { Pricing, AOHead } from '@answeroverflow/ui';
export default function PricingPage() {
	return (
		<>
			<AOHead
				path="/pricing"
				title="Pricing"
				addPrefix
				description="Explore premium features of Answer Overflow to get the most out of your support community"
			/>
			<Pricing />
		</>
	);
}
