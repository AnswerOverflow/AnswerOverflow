"use client";

import { PanelLeftIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { AnswerOverflowLogo } from "../answer-overflow-logo";
import { Button } from "../button";
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

	return (
		<DashboardNavbarContext.Provider
			value={{ mobileSidebarOpen, setMobileSidebarOpen }}
		>
			<div className="relative flex w-full flex-col">
				{/* Header - Fixed at top */}
				<header className="fixed top-0 left-0 right-0 z-50 flex h-navbar items-center gap-4 border-b bg-background px-4">
					{/* Mobile Menu Button */}
					<Button
						variant="ghost"
						size="icon"
						className="lg:hidden"
						onClick={() => setMobileSidebarOpen(true)}
						aria-label="Open sidebar"
					>
						<PanelLeftIcon className="h-5 w-5" />
					</Button>

					{/* Logo */}
					<Link href={homeHref} className="hidden lg:flex items-center">
						<AnswerOverflowLogo width={160} />
						<span className="sr-only">Answer Overflow</span>
					</Link>

					{/* Separator */}
					{serverSelect && (
						<span className="hidden lg:inline text-muted-foreground">/</span>
					)}

					{/* Server Select */}
					<div className="flex-1">
						{serverSelect && <ServerSelectDropdown {...serverSelect} />}
					</div>

					{/* User Section */}
					<UserSection />
				</header>

				{/* Main Content - Offset for navbar */}
				<div className="pt-navbar">{children}</div>
			</div>
		</DashboardNavbarContext.Provider>
	);
}
