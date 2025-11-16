"use client";

import { PanelLeftIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { AnswerOverflowIcon } from "../answer-overflow-icon";
import { Button } from "../button";
import {
	ServerSelectDropdown,
	type ServerSelectDropdownProps,
} from "./server-select-dropdown";
import { UserSection, type UserSectionProps } from "./user-section";

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
	userSection?: UserSectionProps;
	homeHref?: string;
	children?: React.ReactNode;
}

export function DashboardNavbar({
	serverSelect,
	userSection,
	homeHref = "/dashboard",
	children,
}: DashboardNavbarProps) {
	const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

	return (
		<DashboardNavbarContext.Provider
			value={{ mobileSidebarOpen, setMobileSidebarOpen }}
		>
			<div className="relative flex w-full flex-col">
				{/* Header - Fixed at top */}
				<header className="fixed top-0 left-0 right-0 z-50 flex h-[60px] items-center gap-4 border-b bg-background px-4">
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

					{/* Icon */}
					<Link href={homeHref} className="hidden lg:flex items-center">
						<AnswerOverflowIcon size={32} />
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
					{userSection && <UserSection {...userSection} />}
				</header>

				{/* Main Content - Offset for navbar */}
				<div className="pt-[60px]">{children}</div>
			</div>
		</DashboardNavbarContext.Provider>
	);
}
