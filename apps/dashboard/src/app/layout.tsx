import { Providers } from '@answeroverflow/ui/layouts/providers';
import '../styles/globals.css';
import {
	Layout,
	metadata as baseMetadata,
} from '@answeroverflow/ui/layouts/root';
import { Metadata } from 'next';
import React from 'react';
export const metadata: Metadata = {
	...baseMetadata,
	robots: {
		index: false, // It's the app dashboard, so we don't want to index it
	},
};

export default function RootLayout(props: { children?: React.ReactNode }) {
	return (
		<Layout>
			<Providers>{props && props.children ? props.children : null}</Providers>
		</Layout>
	);
}
