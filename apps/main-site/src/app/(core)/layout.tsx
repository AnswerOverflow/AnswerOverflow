import React from 'react';
import { Navbar } from '@answeroverflow/ui/src/components/primitives/navbar/Navbar';
import { Footer } from '@answeroverflow/ui/src/components/primitives/Footer';

/*
  IF UPDATING THIS FILE ALSO UPDATE THE MATCHING ONE IN [domain]/
  yes this should be automated / done with nextjs file routing
  no i dont know how to do it
 */
export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="scrollbar-hide mx-auto flex w-full flex-col items-center overflow-x-hidden overflow-y-scroll bg-background font-body">
			<div className="w-full max-w-screen-2xl justify-center">
				<Navbar tenant={undefined} />
				<main className="px-4 sm:px-[4rem] 2xl:px-[6rem]">{children}</main>
				<Footer tenant={undefined} />
			</div>
		</div>
	);
}
