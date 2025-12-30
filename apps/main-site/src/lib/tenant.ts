import { Database } from "@packages/database/database";
import type { Tenant } from "@packages/ui/components/tenant-context";
import { normalizeSubpath } from "@packages/ui/utils/links";
import { Effect } from "effect";
import { runtime } from "./runtime";

const subpathTenants = [
	{
		rewriteDomain: "migaku.com",
		subpath: "community",
	},
	{
		rewriteDomain: "rhys.ltd",
		subpath: "idk",
	},
	{
		rewriteDomain: "vapi.ai",
		subpath: "community",
	},
];

export type TenantMetadata = {
	tenant: Tenant;
	description: string;
	iconUrl: string;
};

export async function getTenantData(
	domain: string,
): Promise<TenantMetadata | null> {
	const raw = await Effect.gen(function* () {
		const database = yield* Database;
		return yield* database.public.servers.getServerByDomain({ domain });
	}).pipe(runtime.runPromise);

	if (!raw) {
		return null;
	}

	const subpathTenant = subpathTenants.find((t) => t.rewriteDomain === domain);

	const defaultDescription = `Explore the ${raw.server.name} community Discord server on the web. Search and browse discussions, find answers, and join the conversation.`;

	const resolveSubpath = (): string | null => {
		if (subpathTenant) {
			return normalizeSubpath(subpathTenant.subpath);
		}
		if (raw.preferences.subpath) {
			return normalizeSubpath(raw.preferences.subpath);
		}
		return null;
	};

	const tenant: Tenant = {
		customDomain: raw.preferences.customDomain,
		description: raw.server.description ?? defaultDescription,
		subpath: resolveSubpath(),
		name: raw.server.name,
		icon: raw.server.icon,
		discordId: raw.server.discordId,
	};

	const iconUrl = raw.server.icon
		? `https://cdn.answeroverflow.com/${raw.server.discordId}/${raw.server.icon}/icon.png`
		: "";

	const description = raw.server.description ?? defaultDescription;

	return { tenant, description, iconUrl };
}
