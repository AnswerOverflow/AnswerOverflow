'use client';
import React from 'react';

import { Footer } from '@answeroverflow/ui/src/components/primitives/Footer';
import { DashboardNavbar } from '@answeroverflow/ui/src/components/dashboard/dashboard-navbar';
import TRPCProvider from '../../components/trpc-provider';
import { ToastContainer } from 'react-toastify';

export default function RootLayout({
	// Layouts must accept a children prop.
	// This will be populated with nested layouts or pages
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<TRPCProvider>
			<ToastContainer />
			<div className="scrollbar-hide mx-auto flex w-full flex-col items-center overflow-x-hidden overflow-y-scroll bg-background font-body">
				<div className="w-full max-w-screen-2xl justify-center">
					<DashboardNavbar />
					<main className="px-4 sm:px-[4rem] 2xl:px-[6rem]">{children}</main>
					<Footer tenant={undefined} />
				</div>
			</div>
		</TRPCProvider>
	);
}
