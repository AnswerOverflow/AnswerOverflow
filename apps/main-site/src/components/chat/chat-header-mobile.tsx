"use client";

import { Button } from "@packages/ui/components/button";
import { Link } from "@packages/ui/components/link";
import { Menu, PlusIcon } from "lucide-react";
import { useChatSidebar } from "./chat-sidebar";

export function ChatHeaderMobile({ title }: { title: string | null }) {
	const { setMobileSidebarOpen } = useChatSidebar();

	const handleNewChatClick = (e: React.MouseEvent) => {
		e.preventDefault();
		window.location.href = "/chat";
	};

	return (
		<div className="lg:hidden flex items-center gap-2 px-4 py-2 border-b shrink-0">
			<Button
				variant="ghost"
				size="icon"
				onClick={() => setMobileSidebarOpen(true)}
			>
				<Menu className="size-5" />
			</Button>
			<span className="text-sm font-medium truncate flex-1">{title}</span>
			<Button variant="ghost" size="icon" asChild>
				<Link href="/chat" onClick={handleNewChatClick}>
					<PlusIcon className="size-5" />
				</Link>
			</Button>
		</div>
	);
}
