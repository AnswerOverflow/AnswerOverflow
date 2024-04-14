import React from 'react';
import { Footer } from '@answeroverflow/ui/src/footer';
import { Navbar } from '@answeroverflow/ui/src/navbar';
import { BsArrowUpRightCircle, BsHouse } from 'react-icons/bs';
import { LinkButton } from '@answeroverflow/ui/src/ui/link-button';

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="mx-auto flex w-full flex-col items-center overflow-y-auto overflow-x-hidden bg-background font-body">
			<div className="w-full justify-center">
				<Navbar tenant={undefined} />
				<div className="relative isolate grid grid-flow-col">
					<div className="hidden h-screen w-[250px] overflow-y-auto border-b-2 border-r-2 p-4 xl:block">
						<LinkButton
							href="/new"
							className="flex flex-row justify-start gap-3"
							variant={'ghost'}
						>
							<BsHouse className="size-6" />
							Home
						</LinkButton>
						<LinkButton
							href="/"
							className="flex flex-row justify-start gap-3"
							variant={'ghost'}
						>
							<BsArrowUpRightCircle className="size-6" />
							Popular
						</LinkButton>
					</div>
					<div className="max-w-screen-2xl px-1 md:pt-8">
						<main className="mx-auto 2xl:px-[6rem]">{children}</main>
						<Footer tenant={undefined} />
					</div>
				</div>
			</div>
		</div>
	);
}
