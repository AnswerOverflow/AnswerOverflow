"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";

export function HelpfulFeedback(_props: { page: Record<string, unknown> }) {
	const [voted, setVoted] = useState<"Yes" | "No" | null>(null);

	const handleVote = (value: "Yes" | "No") => {
		if (!voted) {
			setVoted(value);
		}
	};

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="text-foreground">
					Did you find this page helpful?
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-2 items-center">
				<div className="flex gap-2">
					<Button
						variant="ghost"
						size="sm"
						className={`group disabled:opacity-100 ${
							voted === "Yes" ? "text-green-500" : "text-foreground"
						}`}
						onClick={() => handleVote("Yes")}
						disabled={voted !== null}
					>
						<ThumbsUp className="mr-1 h-4 w-4 transition-colors group-hover:text-green-500" />
						Yes
					</Button>
					<Button
						variant="ghost"
						size="sm"
						className={`group disabled:opacity-100 ${
							voted === "No" ? "text-red-500" : "text-foreground"
						}`}
						onClick={() => handleVote("No")}
						disabled={voted !== null}
					>
						<ThumbsDown className="mr-1 h-4 w-4 transition-colors group-hover:text-red-500" />
						No
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
