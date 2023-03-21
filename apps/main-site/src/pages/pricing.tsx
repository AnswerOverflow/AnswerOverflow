import Head from 'next/head';
import { Pricing } from '@answeroverflow/ui';
export default function PricingPage() {
	return (
		<>
			<Head>
				<title>Pricing</title>
				<meta name="description" content="Answer Overflow Pricing" />
				<link rel="icon" href="/favicon.ico" />
			</Head>
			<Pricing />
		</>
	);
}
