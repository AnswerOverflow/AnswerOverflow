import { Footer } from '@answeroverflow/ui/footer';
import { Navbar } from '@answeroverflow/ui/navbar/index';
import React from 'react';

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="mx-auto flex w-full flex-col items-center bg-background font-body">
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
