import { Database } from "@packages/database/database";
import type { Tenant } from "@packages/ui/components/tenant-context";
import { normalizeSubpath } from "@packages/ui/utils/links";
import { getSubpathForDomain } from "@packages/ui/utils/tenant-config";
import { Effect } from "effect";
import { runtime } from "./runtime";

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

	const overrideSubpath = getSubpathForDomain(domain);

	const tenant: Tenant = {
		customDomain: raw.preferences.customDomain,
		description:
			raw.server.description ??
			`Browse the ${raw.server.name} Discord community`,
		subpath: overrideSubpath
			? normalizeSubpath(overrideSubpath)
			: raw.preferences.subpath
				? normalizeSubpath(raw.preferences.subpath)
				: null,
		name: raw.server.name,
		icon: raw.server.icon,
		discordId: raw.server.discordId,
	};

	const iconUrl = raw.server.icon
		? `https://cdn.answeroverflow.com/${raw.server.discordId}/${raw.server.icon}/icon.png`
		: "";

	const description =
		raw.server.description ?? `Browse the ${raw.server.name} community`;

	return { tenant, description, iconUrl };
}
