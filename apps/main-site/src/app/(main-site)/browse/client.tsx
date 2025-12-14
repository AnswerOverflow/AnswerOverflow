import type { Server } from "@packages/database/convex/schema";
import { Link } from "@packages/ui/components/link";
import { ServerIcon } from "@packages/ui/components/server-icon";
import Image from "next/image";

function formatMemberCount(count: number): string {
	if (count >= 1000000) {
		return `${(count / 1000000).toFixed(1)}M`;
	}
	if (count >= 1000) {
		return `${(count / 1000).toFixed(1)}K`;
	}
	return count.toLocaleString();
}

const ServerCard = (props: { server: Server }) => {
	const { server } = props;
	return (
		<Link
			href={`/c/${server.discordId}`}
			className="group flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white transition-shadow hover:shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
		>
			<div className="relative h-32 w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
				{server.icon && (
					<Image
						src={`https://cdn.discordapp.com/icons/${server.discordId}/${server.icon}.webp?size=512`}
						alt=""
						fill
						className="object-cover blur-xl scale-110 opacity-50"
					/>
				)}
				<div className="absolute inset-0 flex items-center justify-center">
					<ServerIcon server={server} size={56} />
				</div>
			</div>
			<div className="flex flex-1 flex-col p-4">
				<h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
					{server.name}
				</h3>
				<span className="mt-1 text-sm text-neutral-500">
					{formatMemberCount(server.approximateMemberCount)} members
				</span>
				<p className="mt-2 line-clamp-2 flex-1 text-sm text-neutral-600 dark:text-neutral-400">
					{server.description ?? "Community discussions and Q&A"}
				</p>
			</div>
		</Link>
	);
};

export function ServerGrid(props: { servers: Server[] }) {
	return (
		<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{props.servers.map((server) => (
				<ServerCard key={server.discordId} server={server} />
			))}
		</div>
	);
}
