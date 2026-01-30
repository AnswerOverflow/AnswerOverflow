import { Database } from "@packages/database/database";
import { Effect } from "effect";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { DiscordInviteLanding } from "../../../../components/discord-invite-landing";
import {
	fetchDiscordInvite,
	getDiscordIconUrl,
} from "../../../../lib/discord-invite";
import { runtime } from "../../../../lib/runtime";

export function generateStaticParams() {
	return [{ inviteCode: "answeroverflow" }];
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

export default async function InvitePage(props: Props) {
	const params = await props.params;
	const inviteData = await fetchDiscordInvite(params.inviteCode);

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
