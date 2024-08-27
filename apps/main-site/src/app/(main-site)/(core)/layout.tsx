import React from 'react';
import { Footer } from '@answeroverflow/ui/src/footer';
import { Navbar } from '@answeroverflow/ui/src/navbar';

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="bg-background font-body mx-auto flex w-full flex-col items-center">
			<div className="w-full max-w-screen-2xl justify-center">
				<Navbar tenant={undefined} />
				<main className="mt-16 px-4 sm:px-[4rem] 2xl:px-[6rem]">
					{children}
				</main>
				<Footer tenant={undefined} />
			</div>
		</div>
	);
}
