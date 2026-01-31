import { Database } from "@packages/database/database";
import { Skeleton } from "@packages/ui/components/skeleton";
import { Effect } from "effect";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { DiscordInviteLanding } from "../../../../components/discord-invite-landing";
import {
	fetchDiscordInvite,
	getDiscordIconUrl,
} from "../../../../lib/discord-invite";
import { runtime } from "../../../../lib/runtime";

export function generateStaticParams() {
	return [{ inviteCode: "placeholder" }];
}

async function checkServerExists(guildId: string): Promise<boolean> {
	"use cache";
	cacheLife("minutes");
	cacheTag("server-exists", guildId);

	return Effect.gen(function* () {
		const database = yield* Database;
		const result =
			yield* database.public.servers.getServerByDiscordIdWithChannels({
				discordId: BigInt(guildId),
			});
		return result !== null;
	}).pipe(runtime.runPromise);
}

type Props = {
	params: Promise<{ inviteCode: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
	const params = await props.params;
	const inviteData = await fetchDiscordInvite(params.inviteCode);

	if (!inviteData) {
		return {
			title: "Invalid Invite - Answer Overflow",
		};
	}

	const iconUrl = getDiscordIconUrl(inviteData.guildId, inviteData.guildIcon);

	return {
		title: `${inviteData.guildName} - Answer Overflow`,
		description:
			inviteData.guildDescription ??
			`Join the ${inviteData.guildName} Discord community`,
		openGraph: {
			title: `${inviteData.guildName} - Answer Overflow`,
			description:
				inviteData.guildDescription ??
				`Join the ${inviteData.guildName} Discord community`,
			images: iconUrl ? [{ url: iconUrl, width: 128, height: 128 }] : undefined,
		},
	};
}

function InvitePageSkeleton() {
	return (
		<div className="min-h-screen flex items-center justify-center bg-background">
			<div className="max-w-md w-full mx-auto p-6">
				<div className="flex flex-col items-center gap-4">
					<Skeleton className="h-24 w-24 rounded-full" />
					<Skeleton className="h-8 w-48" />
					<Skeleton className="h-4 w-64" />
					<div className="flex gap-4 mt-4">
						<Skeleton className="h-10 w-10 rounded-full" />
						<Skeleton className="h-10 w-10 rounded-full" />
					</div>
					<Skeleton className="h-12 w-full mt-4" />
				</div>
			</div>
		</div>
	);
}

async function InvitePageContent(props: { inviteCode: string }) {
	const inviteData = await fetchDiscordInvite(props.inviteCode);

	if (!inviteData) {
		return notFound();
	}

	const serverExists = await checkServerExists(inviteData.guildId);

	if (serverExists) {
		redirect(`/c/${inviteData.guildId}`);
	}

	const iconUrl = getDiscordIconUrl(inviteData.guildId, inviteData.guildIcon);

	return (
		<DiscordInviteLanding
			inviteCode={inviteData.code}
			guildId={inviteData.guildId}
			guildName={inviteData.guildName}
			guildIconUrl={iconUrl}
			guildDescription={inviteData.guildDescription}
			memberCount={inviteData.memberCount}
			onlineCount={inviteData.onlineCount}
		/>
	);
}

export default async function InvitePage(props: Props) {
	const params = await props.params;

	return (
		<Suspense fallback={<InvitePageSkeleton />}>
			<InvitePageContent inviteCode={params.inviteCode} />
		</Suspense>
	);
}
