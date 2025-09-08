"use client";

import { api } from "@packages/database/convex/_generated/api";
import { useAction } from "convex/react";
import { useState } from "react";

export default function Home() {
	const identity = useAction(api.dashboard.getForCurrentUser);
	const [discordToken, setDiscordToken] = useState<string | null>(null);
	return (
		<main className="max-w-4xl mx-auto p-8">
			Dashboard
			{discordToken}
			<button
				type="button"
				onClick={async () => {
					setDiscordToken(await identity());
				}}
			>
				Get Discord Token
			</button>
		</main>
	);
}
