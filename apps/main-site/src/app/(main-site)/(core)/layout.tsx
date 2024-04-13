import React from 'react';
import { Footer } from '@answeroverflow/ui/src/footer';
import { Navbar } from '@answeroverflow/ui/src/navbar';
import { BsArrowUpRightCircle } from 'react-icons/bs';
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
					<div className=" sticky hidden h-screen w-[300px] overflow-y-auto border-r-2 p-4 xl:block">
						<LinkButton
							href="/"
							className="flex flex-row justify-start gap-3"
							variant={'ghost'}
						>
							<BsArrowUpRightCircle className="size-6" />
							Popular
						</LinkButton>
						<LinkButton
							href="/new"
							className="flex flex-row justify-start gap-3"
							variant={'ghost'}
						>
							<BsArrowUpRightCircle className="size-6" />
							Home
						</LinkButton>
					</div>
					<div className="max-w-screen-2xl pt-8">
						<main className="mx-auto px-4 2xl:px-[6rem]">{children}</main>
						<Footer tenant={undefined} />
					</div>
				</div>
			</div>
		</div>
	);
}
