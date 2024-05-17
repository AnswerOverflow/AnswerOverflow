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
		<div className="mx-auto flex w-full flex-col items-center bg-background font-body">
			<div className="w-full justify-center">
				<Navbar tenant={server} />
				<div className="mt-16 flex flex-row">
					<div className="mx-auto w-full max-w-screen-2xl px-2 pt-2 xl:pt-8">
						<main className="w-full">{children}</main>
						<Footer tenant={server} />
					</div>
				</div>
			</div>
		</div>
	);
}
