import '../styles/globals.css';
export { metadata } from '@answeroverflow/ui/src/components/layouts/root';
import { Layout } from '@answeroverflow/ui/src/components/layouts/root';
import { ToastContainer } from 'react-toastify';
import React from 'react';
import TRPCProvider from '../components/trpc-provider';

export default function RootLayout(props: { children: React.ReactNode }) {
	return (
		<TRPCProvider>
			<ToastContainer />
			<Layout>{props.children}</Layout>
		</TRPCProvider>
	);
}
