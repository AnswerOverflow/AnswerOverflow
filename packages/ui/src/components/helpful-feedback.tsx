"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { Button } from "./button";

export function HelpfulFeedback(_props: { page: Record<string, unknown> }) {
	const [voted, setVoted] = useState<"Yes" | "No" | null>(null);

	const handleVote = (value: "Yes" | "No") => {
		if (!voted) {
			setVoted(value);
		}
	};

	return (
		<div className="flex flex-col items-center gap-3 py-4">
			<span className="text-sm text-muted-foreground">
				Was this page helpful?
			</span>
			<div className="flex gap-1">
				<Button
					variant="outline"
					size="sm"
					className={`group gap-1.5 rounded-full px-4 transition-all ${
						voted === "Yes"
							? "border-green-500 bg-green-500/10 text-green-500"
							: voted === null
								? "hover:border-green-500/50 hover:bg-green-500/10"
								: "opacity-50"
					}`}
					onClick={() => handleVote("Yes")}
					disabled={voted !== null}
				>
					<ThumbsUp
						className={`h-4 w-4 transition-colors ${
							voted === "Yes" ? "text-green-500" : "group-hover:text-green-500"
						}`}
					/>
					<span className={voted === null ? "group-hover:text-green-500" : ""}>
						Yes
					</span>
				</Button>
				<Button
					variant="outline"
					size="sm"
					className={`group gap-1.5 rounded-full px-4 transition-all ${
						voted === "No"
							? "border-red-500 bg-red-500/10 text-red-500"
							: voted === null
								? "hover:border-red-500/50 hover:bg-red-500/10"
								: "opacity-50"
					}`}
					onClick={() => handleVote("No")}
					disabled={voted !== null}
				>
					<ThumbsDown
						className={`h-4 w-4 transition-colors ${
							voted === "No" ? "text-red-500" : "group-hover:text-red-500"
						}`}
					/>
					<span className={voted === null ? "group-hover:text-red-500" : ""}>
						No
					</span>
				</Button>
			</div>
		</div>
	);
}
