"use client";

import { cn } from "../../lib/utils";
import { Link } from "../link";
import { ServerIcon } from "../server-icon";
import { UserSection } from "./user-section";

export type TenantNavbarProps = {
	showBorder?: boolean;
	server?: {
		discordId: bigint;
		name: string;
		icon: string | null;
	} | null;
};

export function TenantNavbar({ showBorder = true, server }: TenantNavbarProps) {
	return (
		<header
			className={cn(
				"fixed left-0 top-0 z-[1000] h-navbar w-full bg-background/95 backdrop-blur-sm px-4",
				showBorder && "border-b border-border",
			)}
		>
			<nav className="flex size-full items-center justify-between">
				<div className="flex items-center gap-2">
					{server && (
						<Link
							href="/"
							className="flex items-center gap-2 hover:opacity-80 transition-opacity"
						>
							<ServerIcon
								server={{
									discordId: server.discordId,
									name: server.name,
									icon: server.icon ?? undefined,
								}}
								size={28}
							/>
							<span className="font-medium text-foreground">{server.name}</span>
						</Link>
					)}
				</div>
				<UserSection showSignIn={false} />
			</nav>
		</header>
	);
}
