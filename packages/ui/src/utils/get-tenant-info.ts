import { isOnMainSite } from '@answeroverflow/constants';
import { findServerByCustomDomain } from '@answeroverflow/db';
import { headers } from 'next/headers';

export async function getTenantInfo() {
	const hostname = headers().get('host');
	if (!hostname) throw new Error('No hostname');

	const tenant = isOnMainSite(hostname)
		? undefined
		: await findServerByCustomDomain(hostname);
	if (!tenant) {
		return {
			isOnTenantSite: false,
			tenant: undefined,
		};
	}
	return {
		isOnTenantSite: true,
		tenant,
	};
}
