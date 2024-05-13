import React from 'react';
import { Footer } from '@answeroverflow/ui/src/footer';
import { Separator } from '@answeroverflow/ui/src/ui/separator';
import { Navbar } from '@answeroverflow/ui/src/navbar';
import { BsArrowUpRightCircle, BsHouse } from 'react-icons/bs';
import { LinkButton } from '@answeroverflow/ui/src/ui/link-button';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@answeroverflow/ui/src/ui/accordion';
import { IoCodeOutline, IoGameControllerOutline } from 'react-icons/io5';

type Category = {
	name: string;
	icon: React.ReactNode;
	servers: {
		id: string;
		name: string;
	}[];
};

const categories: Category[] = [
	{
		icon: <IoGameControllerOutline className="size-6" />,
		name: 'Gaming',
		servers: [
			{
				id: '393088095840370689',
				name: 'PUBG Mobile',
			},
			{
				id: '679875946597056683',
				name: 'Valorant',
			},
			{
				id: '303681520202285057',
				name: 'BattleBit Remastered',
			},
			{
				id: '693237498264027156',
				name: 'Combat Warriors',
			},
		],
	},
	{
		icon: <IoCodeOutline className="size-6" />,
		name: 'Programming',
		servers: [
			{
				id: '222078108977594368',
				name: 'Discord.JS',
			},
			{
				id: '684898665143206084',
				name: 'Deno',
			},
			{
				id: '1043890932593987624',
				name: 'Drizzle',
			},
			{
				id: '473401852243869706',
				name: 'Nuxt',
			},
			{
				id: '713503345364697088',
				name: 'Railway',
			},
			{
				id: '966627436387266600',
				name: `Theo's Typesafe Cult`,
			},
			{
				id: '867764511159091230',
				name: 'tRPC',
			},
			{
				id: '893487829802418277',
				name: 'Zod',
			},
		],
	},
];

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="mx-auto flex w-full flex-col items-center bg-background font-body">
			<div className="w-full justify-center">
				<Navbar tenant={undefined} />
				<div className="mt-16 flex flex-row">
					<div className="fixed top-0 mt-16 hidden h-screen min-w-[250px] max-w-[250px] shrink-0 border-b-2 border-r-2 p-4 xl:block">
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
						<Separator className="my-2" />
						<span className="px-4 font-semibold text-accent-foreground">
							Topics
						</span>
						<Accordion type="multiple" className="py-2">
							{categories.map((category) => (
								<>
									<AccordionItem
										value={category.name}
										className="border-0"
										key={category.name}
									>
										<AccordionTrigger className="flex flex-row items-center justify-between gap-3 rounded-md px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
											<div className="flex flex-row items-center justify-start gap-3">
												{category.icon}
												{category.name}
											</div>
										</AccordionTrigger>
										<AccordionContent className="flex flex-col">
											{category.servers.map((server) => (
												<LinkButton
													href={`/c/${server.id}`}
													key={server.id}
													variant="ghost"
													className="ml-7 w-full justify-start rounded-none border-l-2"
												>
													{server.name}
												</LinkButton>
											))}
										</AccordionContent>
									</AccordionItem>
								</>
							))}
						</Accordion>
					</div>
					<div className="mx-auto w-full max-w-screen-2xl px-2 pt-2 xl:ml-[250px] xl:mr-auto xl:pt-8">
						<main className="w-full">{children}</main>
						<Footer tenant={undefined} />
					</div>
				</div>
			</div>
		</div>
	);
}
