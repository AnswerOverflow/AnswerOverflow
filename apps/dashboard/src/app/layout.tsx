import '../styles/globals.css';
import {
	Layout,
	metadata as baseMetadata,
} from '@answeroverflow/ui/src/components/layouts/root';
import { ToastContainer } from 'react-toastify';
import React from 'react';
import TRPCProvider from '../components/trpc-provider';
import { Metadata } from 'next';

export const metadata: Metadata = {
	...baseMetadata,
	robots: {
		index: false, // It's the app dashboard, so we don't want to index it
	},
};

export default function RootLayout(props: { children?: React.ReactNode }) {
	return (
		<Layout>
			<TRPCProvider>
				{props && props.children ? props.children : null}
			</TRPCProvider>
		</Layout>
	);
}
