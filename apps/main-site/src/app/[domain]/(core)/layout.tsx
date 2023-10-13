import React from 'react';
import { Navbar } from '@answeroverflow/ui/src/components/primitives/navbar/Navbar';
import { Footer } from '@answeroverflow/ui/src/components/primitives/Footer';
import { notFound } from 'next/navigation';
import { findServerByCustomDomain } from '@answeroverflow/db';

export default async function RootLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: { domain: string };
}) {
	const server = await findServerByCustomDomain(
		decodeURIComponent(params.domain),
	);
	if (!server) {
		return notFound();
	}
	return (
		<div className="mx-auto flex w-full flex-col items-center overflow-x-hidden overflow-y-scroll bg-background font-body scrollbar-hide">
			<div className="w-full max-w-screen-2xl justify-center">
				<Navbar isOnTenantSite={true} tenant={server} />
				<main className="px-4 sm:px-[4rem] 2xl:px-[6rem]">{children}</main>
				<Footer isOnTenantSite={true} />
			</div>
		</div>
	);
}
