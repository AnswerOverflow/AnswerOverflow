import { Footer } from '@answeroverflow/ui/footer';
import { LeftSidebar } from '@answeroverflow/ui/left-sidebar';
import { Navbar } from '@answeroverflow/ui/navbar/index';
import React from 'react';

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
					<div className="mx-auto w-full max-w-screen-2xl px-2 pt-2">
						<div className="w-full">{children}</div>
						<Footer tenant={undefined} />
					</div>
				</div>
			</div>
		</div>
	);
}
