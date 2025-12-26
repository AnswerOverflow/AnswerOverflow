export type TenantOverride = {
	contentDomain: string;
	rewriteDomain: string;
	subpath: string;
};

export const tenantOverrides: TenantOverride[] = [
	{
		contentDomain: "community.migaku.com",
		rewriteDomain: "migaku.com",
		subpath: "community",
	},
	{
		contentDomain: "testing.rhys.ltd",
		rewriteDomain: "rhys.ltd",
		subpath: "idk",
	},
	{
		contentDomain: "discord.vapi.ai",
		rewriteDomain: "vapi.ai",
		subpath: "community",
	},
];

export function getTenantOverrideByContentDomain(
	contentDomain: string,
): TenantOverride | undefined {
	return tenantOverrides.find((t) => contentDomain.includes(t.contentDomain));
}

export function getTenantOverrideByRewriteDomain(
	rewriteDomain: string,
): TenantOverride | undefined {
	return tenantOverrides.find((t) => t.rewriteDomain === rewriteDomain);
}

export function getSubpathForDomain(domain: string): string | null {
	const override = getTenantOverrideByRewriteDomain(domain);
	return override?.subpath ?? null;
}
