import { Suspense } from "react";
import {
	ChatPageHandler,
	ChatPageSkeleton,
} from "@/components/chat/chat-page-handler";

export default function ChatPage() {
	return (
		<Suspense fallback={<ChatPageSkeleton />}>
			<ChatPageHandler />
		</Suspense>
	);
}
