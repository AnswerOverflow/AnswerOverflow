import { findAllServers } from '@answeroverflow/core/server';
import { BlueLink } from '@answeroverflow/ui/ui/blue-link';

export default async function AllPosts() {
	const servers = await findAllServers({
		includeCustomDomain: false,
		includeKicked: false,
	});
	return (
		<div className="mx-auto max-w-2xl">
			<h1 className="font-bold">All posts by community</h1>
			<ul className="ml-4 list-disc">
				{servers.map((server) => (
					<li key={server.id}>
						<BlueLink prefetch={false} href={`/c/${server.id}/posts/0`}>
							{server.name}
						</BlueLink>
					</li>
				))}
			</ul>
		</div>
	);
}
