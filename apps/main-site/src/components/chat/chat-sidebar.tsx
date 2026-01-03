"use client";

import { api } from "@packages/database/convex/_generated/api";
import { AnswerOverflowLogo } from "@packages/ui/components/answer-overflow-logo";
import { Button } from "@packages/ui/components/button";
import { useSession } from "@packages/ui/components/convex-client-provider";
import { Link } from "@packages/ui/components/link";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@packages/ui/components/sheet";
import { cn } from "@packages/ui/lib/utils";
import { usePaginatedQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { Loader2, Menu, MessageSquare, MessageSquarePlus } from "lucide-react";
import { usePathname } from "next/navigation";
import { createContext, useContext, useState } from "react";

type ChatSidebarContextValue = {
	mobileSidebarOpen: boolean;
	setMobileSidebarOpen: (open: boolean) => void;
};

const ChatSidebarContext = createContext<ChatSidebarContextValue | null>(null);

export function useChatSidebar() {
	const context = useContext(ChatSidebarContext);
	if (!context) {
		throw new Error("useChatSidebar must be used within a ChatSidebar");
	}
	return context;
}

function ThreadList({ onThreadClick }: { onThreadClick?: () => void }) {
	const pathname = usePathname();
	const session = useSession({ allowAnonymous: false });
	const isAuthenticated = !!session?.data;
	const isLoading = session.isPending;

	const {
		results: threads,
		status,
		loadMore,
	} = usePaginatedQuery(
		api.chat.mutations.listThreads,
		isAuthenticated ? {} : "skip",
		{ initialNumItems: 20 },
	);

	if (isLoading || status === "LoadingFirstPage") {
		return (
			<div className="flex items-center justify-center py-8">
				<Loader2 className="size-4 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!isAuthenticated) {
		return (
			<div className="flex flex-col items-center justify-center py-8 px-4 text-center">
				<MessageSquare className="size-8 text-muted-foreground mb-2" />
				<p className="text-sm text-muted-foreground">
					Sign in to see your chats
				</p>
			</div>
		);
	}

	if (threads.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-8 px-4 text-center">
				<MessageSquare className="size-8 text-muted-foreground mb-2" />
				<p className="text-sm text-muted-foreground">No conversations yet</p>
				<p className="text-xs text-muted-foreground mt-1">
					Start a new chat to begin
				</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-1">
			{threads.map((thread) => {
				const threadPath = `/chat/t/${thread._id}`;
				const isActive = pathname === threadPath;
				const title = thread.title ?? "New conversation";
				const timeAgo = formatDistanceToNow(new Date(thread._creationTime), {
					addSuffix: true,
				});

				return (
					<Link
						key={thread._id}
						href={threadPath}
						onClick={onThreadClick}
						className={cn(
							"group flex items-start gap-3 rounded-md px-3 py-2 text-sm transition-colors",
							isActive
								? "bg-accent text-accent-foreground"
								: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
						)}
					>
						<MessageSquare className="size-4 mt-0.5 shrink-0" />
						<div className="flex-1 min-w-0">
							<div className="truncate font-medium">{title}</div>
							<div className="text-xs text-muted-foreground">{timeAgo}</div>
						</div>
					</Link>
				);
			})}
			{status === "CanLoadMore" && (
				<Button
					variant="ghost"
					size="sm"
					className="w-full mt-2"
					onClick={() => loadMore(20)}
				>
					Load more
				</Button>
			)}
		</div>
	);
}

function SidebarHeader() {
	return (
		<div className="h-navbar flex items-center justify-between px-4 border-b shrink-0">
			<Link href="/" className="flex items-center">
				<AnswerOverflowLogo width={160} />
				<span className="sr-only">Answer Overflow</span>
			</Link>
		</div>
	);
}

function SidebarContent({ onThreadClick }: { onThreadClick?: () => void }) {
	return (
		<div className="flex flex-col h-full">
			<SidebarHeader />
			<div className="p-4">
				<Button asChild className="w-full" variant="outline">
					<Link href="/chat">
						<MessageSquarePlus className="size-4 mr-2" />
						New chat
					</Link>
				</Button>
			</div>
			<div className="flex-1 overflow-y-auto px-4 pb-4">
				<div className="text-xs font-medium text-muted-foreground mb-2">
					Recent conversations
				</div>
				<ThreadList onThreadClick={onThreadClick} />
			</div>
		</div>
	);
}

export function ChatSidebarToggle() {
	const { setMobileSidebarOpen } = useChatSidebar();

	return (
		<Button
			variant="ghost"
			size="icon"
			className="lg:hidden"
			onClick={() => setMobileSidebarOpen(true)}
		>
			<Menu className="size-5" />
			<span className="sr-only">Open sidebar</span>
		</Button>
	);
}

export function ChatSidebar({ children }: { children: React.ReactNode }) {
	const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

	return (
		<ChatSidebarContext.Provider
			value={{ mobileSidebarOpen, setMobileSidebarOpen }}
		>
			<div className="relative flex w-full">
				<aside className="hidden lg:flex fixed left-0 top-0 bottom-0 z-50 w-[280px] flex-col border-r bg-background">
					<SidebarContent />
				</aside>

				<Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
					<SheetContent side="left" className="w-[280px] p-0">
						<SheetHeader className="sr-only">
							<SheetTitle>Chat History</SheetTitle>
						</SheetHeader>
						<SidebarContent onThreadClick={() => setMobileSidebarOpen(false)} />
					</SheetContent>
				</Sheet>

				<div className="lg:ml-[280px] flex-1 overflow-hidden">{children}</div>
			</div>
		</ChatSidebarContext.Provider>
	);
}
