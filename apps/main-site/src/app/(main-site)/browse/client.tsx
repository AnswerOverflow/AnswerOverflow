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
	const hasBanner = Boolean(server.banner);

	return (
		<Link
			href={`/c/${server.discordId}`}
			className="group relative flex flex-col overflow-hidden rounded-xl border border-neutral-200/50 bg-white transition-all hover:border-neutral-300 hover:shadow-xl dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
		>
			<div className="relative h-24 w-full overflow-hidden">
				{hasBanner ? (
					<Image
						src={`https://cdn.discordapp.com/banners/${server.discordId}/${server.banner}.webp?size=480`}
						alt=""
						fill
						className="object-cover transition-transform group-hover:scale-105"
					/>
				) : server.icon ? (
					<Image
						src={`https://cdn.discordapp.com/icons/${server.discordId}/${server.icon}.webp?size=64`}
						alt=""
						fill
						className="object-cover scale-[3] blur-2xl saturate-150"
					/>
				) : (
					<div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600" />
				)}
				<div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
			</div>
			<div className="-mt-6 relative flex flex-1 flex-col p-4">
				<div className="flex items-start gap-3">
					<div className="shrink-0">
						<ServerIcon server={server} size={48} />
					</div>
					<div className="min-w-0 flex-1 pt-2">
						<h3 className="truncate font-semibold text-neutral-900 dark:text-neutral-100">
							{server.name}
						</h3>
						<span className="text-sm text-neutral-500">
							{formatMemberCount(server.approximateMemberCount)} members
						</span>
					</div>
				</div>
				{server.description && (
					<p className="mt-3 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
						{server.description}
					</p>
				)}
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
