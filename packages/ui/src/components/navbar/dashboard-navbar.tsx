"use client";

import { PanelLeftIcon } from "lucide-react";
import * as React from "react";
import { AnswerOverflowLogo } from "../answer-overflow-logo";
import { Button } from "../button";
import { useIsImpersonating } from "../impersonation-banner";
import { Link } from "../link";
import {
	ServerSelectDropdown,
	type ServerSelectDropdownProps,
} from "./server-select-dropdown";
import { UserSection } from "./user-section";

interface DashboardNavbarContextValue {
	mobileSidebarOpen: boolean;
	setMobileSidebarOpen: (open: boolean) => void;
}

const DashboardNavbarContext =
	React.createContext<DashboardNavbarContextValue | null>(null);

export function useDashboardNavbar() {
	const context = React.useContext(DashboardNavbarContext);
	if (!context) {
		throw new Error("useDashboardNavbar must be used within DashboardNavbar");
	}
	return context;
}

export interface DashboardNavbarProps {
	serverSelect?: ServerSelectDropdownProps;
	homeHref?: string;
	children?: React.ReactNode;
}

export function DashboardNavbar({
	serverSelect,
	homeHref = "/",
	children,
}: DashboardNavbarProps) {
	const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);
	const isImpersonating = useIsImpersonating();

	return (
		<DashboardNavbarContext.Provider
			value={{ mobileSidebarOpen, setMobileSidebarOpen }}
		>
			<div className="relative flex w-full flex-col">
				<header
					className="fixed left-0 right-0 z-40 flex h-navbar items-center gap-4 border-b bg-background px-4 lg:pl-[calc(255.44px+1rem)]"
					style={{ top: isImpersonating ? "40px" : "0" }}
				>
					<Button
						variant="ghost"
						size="icon"
						className="lg:hidden"
						onClick={() => setMobileSidebarOpen(true)}
						aria-label="Open sidebar"
					>
						<PanelLeftIcon className="h-5 w-5" />
					</Button>

					<Link
						href={homeHref}
						className="lg:hidden flex items-center shrink-0"
					>
						<AnswerOverflowLogo width={140} />
						<span className="sr-only">Answer Overflow</span>
					</Link>

					<div className="flex-1 min-w-0">
						{serverSelect && <ServerSelectDropdown {...serverSelect} />}
					</div>

					<UserSection />
				</header>

				{/* Main Content - Offset for navbar */}
				<div className="pt-navbar">{children}</div>
			</div>
		</DashboardNavbarContext.Provider>
	);
}
