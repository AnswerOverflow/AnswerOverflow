import Link from 'next/link';
import { Button } from '@answeroverflow/ui/src/ui/button';
import {
	Sheet,
	SheetContent,
	SheetTrigger,
} from '@answeroverflow/ui/src/ui/sheet';
import { UserSection } from '@answeroverflow/ui/src/navbar/client';
import { AnswerOverflowLogo } from 'packages/ui/src/icons/answer-overflow-logo';
import { FaHome } from 'react-icons/fa';
import { FaGear } from 'react-icons/fa6';
import { ServerSelectDropdown } from './components/navbar';

export default function Layout(props: {
	children?: React.ReactNode;
	params: { serverId: string };
}) {
	const dashboardPaths = [
		{
			path: `/dashboard/${props.params.serverId}`,
			label: 'Home',
			icon: <FaHome className="size-5" />,
		},
		{
			path: `/dashboard/${props.params.serverId}/settings`,
			label: 'Settings',
			icon: <FaGear className="size-5" />,
		},
	];
	return (
		<div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
			<div className="hidden border-r bg-muted/40 md:block">
				<div className="flex h-full max-h-screen flex-col gap-2">
					<div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
						<Link href="/" className="flex items-center gap-2 font-semibold">
							<AnswerOverflowLogo width={140} />
						</Link>
					</div>
					<div className="flex-1">
						<nav className="grid items-start px-2 text-sm font-medium lg:px-4">
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
					</div>
				</div>
			</div>
			<div className="flex flex-col">
				<header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
					<Sheet>
						<SheetTrigger asChild>
							<Button
								variant="outline"
								size="icon"
								className="shrink-0 md:hidden"
							>
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
					<UserSection tenant={undefined} />
				</header>
				<main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
					{props.children}
				</main>
			</div>
		</div>
	);
}
