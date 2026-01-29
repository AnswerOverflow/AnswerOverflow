"use client";

import { cn } from "@packages/ui/lib/utils";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type FloatingAskInputProps = {
	serverDiscordId: string;
	serverName: string;
	pageContext: {
		type: "message";
		threadName?: string;
		channelName: string;
		messageId: string;
	};
};

export function FloatingAskInput({
	serverDiscordId,
	serverName,
	pageContext,
}: FloatingAskInputProps) {
	const router = useRouter();
	const [input, setInput] = useState("");
	const [isFocused, setIsFocused] = useState(false);
	const inputRef = useRef<HTMLTextAreaElement>(null);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!input.trim()) return;

		const contextPrefix = `Context: I'm looking at discussion ${pageContext.messageId} from ${serverName} (${serverDiscordId})\n\n`;

		const fullMessage = contextPrefix + input.trim();

		const params = new URLSearchParams();
		params.set("server", serverDiscordId);
		params.set("q", fullMessage);

		router.push(`/chat?${params.toString()}`);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Escape") {
			inputRef.current?.blur();
			setInput("");
		}
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			if (input.trim()) {
				handleSubmit(e);
			}
		}
	};

	return (
		<div className="fixed bottom-20 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
			<form onSubmit={handleSubmit} className="pointer-events-auto">
				<div
					className={cn(
						"flex items-end bg-card/95 backdrop-blur-sm border rounded-xl shadow-lg transition-all duration-300 ease-out",
						isFocused
							? "w-96 px-4 py-3 ring-2 ring-primary/20 border-primary/50 shadow-xl"
							: "w-56 px-4 py-3 hover:shadow-xl hover:border-border/80",
					)}
				>
					<textarea
						ref={inputRef}
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onFocus={() => setIsFocused(true)}
						onBlur={() => setIsFocused(false)}
						onKeyDown={handleKeyDown}
						placeholder="Ask a question..."
						rows={1}
						className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground resize-none min-h-6 max-h-32 field-sizing-content"
					/>
					{input.trim() && (
						<kbd className="hidden sm:inline-flex items-center gap-1 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground ml-2 mb-0.5">
							↵
						</kbd>
					)}
				</div>
			</form>
		</div>
	);
}
