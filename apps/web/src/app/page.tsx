"use client";

import { useQuery } from "convex/react";
import { api } from "@packages/convex/convex/_generated/api";

export default function Home() {
	const servers = useQuery(api.servers.publicGetServers);
	return (
		<main className="max-w-4xl mx-auto p-8">
			<div className="space-y-4 mb-8">
				{servers?.map((server) => (
					<div
						key={server._id}
						className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800 flex justify-between items-center"
					>
						<span>{server.name}</span>
					</div>
				))}
			</div>
		</main>
	);
}
