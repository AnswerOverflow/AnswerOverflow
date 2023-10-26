import React from 'react';
import { Navbar } from '@answeroverflow/ui/src/components/primitives/navbar/Navbar';
import { Footer } from '@answeroverflow/ui/src/components/primitives/Footer';

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="mx-auto flex w-full flex-col items-center overflow-y-auto overflow-x-hidden bg-background font-body">
			<div className="w-full max-w-screen-2xl justify-center">
				<Navbar tenant={undefined} />
				<main className="px-4 sm:px-[4rem] 2xl:px-[6rem]">{children}</main>
				<Footer tenant={undefined} />
			</div>
		</div>
	);
}
