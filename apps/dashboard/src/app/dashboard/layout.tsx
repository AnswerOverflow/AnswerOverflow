'use client';
import React from 'react';

import { Footer } from '@answeroverflow/ui/src/components/primitives/footer';
import { Navbar } from './_components/navbar';

export default function Layout({
	// Layouts must accept a children prop.
	// This will be populated with nested layouts or pages
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="mx-auto flex w-full flex-col items-center overflow-y-auto overflow-x-hidden bg-background font-body">
			<div
				className={
					'w-full items-center justify-center bg-primary/5 py-1 text-center text-center md:flex'
				}
			>
				<span className={' text-sm text-primary'}>
					⚠️ Data between October 25th and November 7th is missing a majority of
					page views due to misconfigured analytics. We apologize for the
					inconvenience and are working to make sure this {"doesn't"} happen
					again. ⚠️
				</span>
			</div>
			<div className="w-full max-w-screen-2xl justify-center">
				<Navbar />
				<main className="px-4 sm:px-[4rem] 2xl:px-[6rem]">{children}</main>
				<Footer tenant={undefined} />
			</div>
		</div>
	);
}
