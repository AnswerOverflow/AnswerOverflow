import React from 'react';
import { Footer } from '@answeroverflow/ui/src/footer';
import { Navbar } from '@answeroverflow/ui/src/navbar';
import { LeftSidebar } from '@answeroverflow/ui/src/left-sidebar';

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="bg-background font-body mx-auto flex w-full flex-col items-center">
			<div className="relative w-full">
				<Navbar tenant={undefined} />
				<div className="mt-16 flex flex-row">
					<LeftSidebar />
					<div className="mx-auto w-full max-w-screen-2xl px-2 pt-2">
						<div className="w-full">{children}</div>
						<Footer tenant={undefined} />
					</div>
				</div>
			</div>
		</div>
	);
}
