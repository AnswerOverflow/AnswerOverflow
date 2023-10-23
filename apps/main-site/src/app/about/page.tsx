import { AboutArea } from '~ui/components/pages/home/AboutArea';
import { metadata as baseMetadata } from '../layout';
import { Metadata } from 'next';
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
	return <AboutArea />;
}
