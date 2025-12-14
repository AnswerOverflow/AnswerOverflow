import type { Server } from "@packages/database/convex/schema";

export function getServerDescription(
	server: Pick<Server, "name" | "description">,
): string {
	return (
		server.description ?? `Join the ${server.name} server to ask questions!`
	);
}
