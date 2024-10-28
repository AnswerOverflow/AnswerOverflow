'use client';
import { Footer } from '@answeroverflow/ui/footer';
import { AnswerOverflowLogo } from '@answeroverflow/ui/icons/answer-overflow-logo';
import { UserSection } from '@answeroverflow/ui/navbar/client';
import { Button } from '@answeroverflow/ui/ui/button';
import { LinkButton } from '@answeroverflow/ui/ui/link-button';
import { Sheet, SheetContent, SheetTrigger } from '@answeroverflow/ui/ui/sheet';
import { trpc } from '@answeroverflow/ui/utils/client';
import {
	CogIcon,
	HashIcon,
	HomeIcon,
	MenuIcon,
	PuzzleIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DashboardProvider } from './components/dashboard-context';
import { demoServerData } from './components/mock';
import { ServerSelectDropdown } from './components/navbar';
export default function Layout(props: {
	children?: React.ReactNode;
	params: { serverId: string };
}) {
	const [toFrom, setToFrom] = useState<{
		from: Date;
		to: Date;
	}>({
		from: new Date(new Date().setDate(new Date().getDate() - 7)),
		to: new Date(),
	});
	const dashboardPaths = [
		{
			path: `/dashboard/${props.params.serverId}`,
			label: 'Home',
			icon: <HomeIcon className="size-5" />,
		},
		{
			path: `/dashboard/${props.params.serverId}/integrations`,
			label: 'Integrations',
			icon: <PuzzleIcon className="size-5" />,
		},
		{
			path: `/dashboard/${props.params.serverId}/settings`,
			label: 'Settings',
			icon: <CogIcon className="size-5" />,
		},
		{
			path: `/dashboard/${props.params.serverId}/channels`,
			label: 'Channels',
			icon: <HashIcon className="size-5" />,
		},
	];
	const router = useRouter();
	const { data } = trpc.dashboard.fetchDashboardById.useQuery(
		props.params.serverId,
		{
			initialData:
				props.params.serverId === '1000' ? demoServerData : undefined,
			onError: (err) => {
				console.error(err);
				router.push('/');
			},
		},
	);
	if (!data) {
		return null;
	}
	return (
		<DashboardProvider
			value={{
				options: {
					serverId: data.id,
					from: toFrom.from,
					to: toFrom.to,
					setRange: (opts) => setToFrom(opts),
				},
				server: data,
			}}
		>
			<div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
				<div className="hidden border-r md:block">
					<div className="flex h-full max-h-screen flex-col gap-2">
						<div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
							<Link href="/" className="flex items-center gap-2 font-semibold">
								<AnswerOverflowLogo width={140} />
							</Link>
						</div>
						<div className="flex-1">
							<nav className="grid items-start gap-2 px-2 text-sm font-medium lg:px-4">
								{dashboardPaths.map((path) => {
									return (
										<LinkButton
											href={path.path}
											key={path.path}
											variant={'ghost'}
											selectedVariant={'secondary'}
											className="flex justify-start gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
										>
											{path.icon}
											{path.label}
										</LinkButton>
									);
								})}
							</nav>
						</div>
					</div>
				</div>
				<div className="flex flex-col">
					<header className="flex h-14 items-center gap-4 border-b p-4 lg:h-[60px]">
						<Sheet>
							<SheetTrigger asChild>
								<Button
									variant="outline"
									size="icon"
									className="shrink-0 md:hidden"
								>
									<MenuIcon className="h-6 w-6" />
									<span className="sr-only">Toggle navigation menu</span>
								</Button>
							</SheetTrigger>
							<SheetContent side="left" className="flex flex-col">
								<nav className="grid gap-2 text-lg font-medium">
									{dashboardPaths.map((path) => {
										return (
											<Link
												href={path.path}
												key={path.path}
												className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
											>
												{path.icon}
												{path.label}
											</Link>
										);
									})}
								</nav>
							</SheetContent>
						</Sheet>
						<div className="w-full flex-1">
							<ServerSelectDropdown />
						</div>
						<UserSection tenant={undefined} dashboard />
					</header>
					<main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
						{props.children}
					</main>
					<Footer tenant={undefined} />
				</div>
			</div>
		</DashboardProvider>
	);
}
