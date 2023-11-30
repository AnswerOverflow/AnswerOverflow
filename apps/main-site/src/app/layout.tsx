import '../styles/globals.css';
export { Layout as default } from '@answeroverflow/ui/src/components/layouts/root';

import { metadata as baseMetadata } from '@answeroverflow/ui/src/components/layouts/root';
import { Metadata } from 'next';
export const metadata: Metadata = {
	...baseMetadata,
	other: {
		'google-adsense-account': 'ca-pub-1392153990042810',
	},
};
