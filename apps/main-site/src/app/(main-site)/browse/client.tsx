import type { Server } from "@packages/database/convex/schema";
import { ServerCard } from "@packages/ui/components/server-card";

export function ServerGrid(props: { servers: Server[] }) {
	return (
		<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{props.servers.map((server) => (
				<ServerCard key={server.discordId} server={server} />
			))}
		</div>
	);
}
