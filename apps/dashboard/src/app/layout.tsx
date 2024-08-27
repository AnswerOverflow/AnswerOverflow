import '../styles/globals.css';
import '@unocss/reset/tailwind.css';
import 'uno.css';
import {
	Layout,
	metadata as baseMetadata,
} from '@answeroverflow/ui/src/layouts/root';
import React from 'react';
import { Metadata } from 'next';
export const metadata: Metadata = {
	...baseMetadata,
	robots: {
		index: false, // It's the app dashboard, so we don't want to index it
	},
};

export default function RootLayout(props: { children?: React.ReactNode }) {
	return <Layout>{props && props.children ? props.children : null}</Layout>;
}
