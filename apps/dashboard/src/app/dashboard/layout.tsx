'use client';
import React from 'react';

import { Footer } from '@answeroverflow/ui/src/components/primitives/Footer';
import { DashboardNavbar } from '@answeroverflow/ui/src/components/dashboard/dashboard-navbar';

export default function Layout({
	// Layouts must accept a children prop.
	// This will be populated with nested layouts or pages
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="mx-auto flex w-full flex-col items-center overflow-y-auto overflow-x-hidden bg-background font-body">
			<div className="w-full max-w-screen-2xl justify-center">
				<DashboardNavbar />
				<main className="px-4 sm:px-[4rem] 2xl:px-[6rem]">{children}</main>
				<Footer tenant={undefined} />
			</div>
		</div>
	);
}
