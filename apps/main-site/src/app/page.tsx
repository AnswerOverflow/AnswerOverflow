"use client";

import { api } from "../../../../packages/database/convex/_generated/api";
import { useQuery } from "convex/react";

export default function Home() {
	const servers = useQuery(api.servers.publicGetAllServers);
	return (
		<main className="max-w-4xl mx-auto p-8">
			servers:
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
