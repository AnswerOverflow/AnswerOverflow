import React from 'react';
import { Footer } from '@answeroverflow/ui/src/footer';
import { Navbar } from '@answeroverflow/ui/src/navbar';
import { LeftSidebar } from '@answeroverflow/ui/src/leftsidebar';

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="mx-auto flex w-full flex-col items-center bg-background font-body">
			<div className="relative w-full">
				<Navbar tenant={undefined} />
				<div className="mt-16 flex flex-row">
					<LeftSidebar />
					<div className="mx-auto w-full max-w-screen-2xl px-2 pt-2 xl:pt-8">
						<main className="w-full">{children}</main>
						<Footer tenant={undefined} />
					</div>
				</div>
			</div>
		</div>
	);
}
