import React from 'react';
import { Navbar } from '@answeroverflow/ui/src/navbar';
import { Footer } from '@answeroverflow/ui/src/footer';
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
		<div className="mx-auto flex w-full flex-col items-center overflow-y-auto overflow-x-hidden bg-background font-body">
			<div className="w-full max-w-screen-2xl justify-center">
				<Navbar tenant={server} />
				<main className="px-4 sm:px-[4rem] 2xl:px-[6rem]">{children}</main>
				<Footer tenant={server} />
			</div>
		</div>
	);
}
