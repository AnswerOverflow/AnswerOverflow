"use client";

import { useHideOnScroll } from "../../hooks/use-hide-on-scroll";
import { useIsMobile } from "../../hooks/use-mobile";
import { cn } from "../../lib/utils";
import { useIsImpersonating } from "../impersonation-banner";
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
	const isImpersonating = useIsImpersonating();
	const isMobile = useIsMobile();
	const isHidden = useHideOnScroll(isMobile);

	return (
		<header
			className={cn(
				"fixed left-0 z-40 h-navbar w-full bg-background/95 backdrop-blur-sm px-4 transition-transform duration-300",
				showBorder && "border-b border-border",
				isHidden && "-translate-y-full",
			)}
			style={{ top: isImpersonating ? "40px" : "0" }}
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
