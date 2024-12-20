import { Navbar } from '@answeroverflow/ui/navbar/index';
import React from 'react';

import { findServerByCustomDomain } from '@answeroverflow/core/server';
import { Footer } from '@answeroverflow/ui/footer';
import { notFound } from 'next/navigation';

export default async function RootLayout(props: {
	children: React.ReactNode;
	params: Promise<{ domain: string }>;
}) {
	const params = await props.params;

	const { children } = props;

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
						<div className="w-full">{children}</div>
						<Footer tenant={server} />
					</div>
				</div>
			</div>
		</div>
	);
}
