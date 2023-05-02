/*
  Main Site Info:
  host: "www.answeroverflow.com"
  hostname: "www.answeroverflow.com"
  href: "https://www.answeroverflow.com/"
  origin: "https://www.answeroverflow.com"
*/
import { createContext, useContext } from 'react';
import type { ServerPublic } from '@answeroverflow/api';

export function useIsOnTenantSite() {
	if (typeof window === 'undefined') return false;
	const { host } = window.location;
	if (process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === 'production') {
		return host !== 'www.answeroverflow.com';
	}
	return host !== 'localhost:3000';
}

const TenantContext = createContext<ServerPublic | null>(null);

export const TenantContextProvider = TenantContext.Provider;

export function useTenantContext() {
	const tenant = useContext(TenantContext);
	// TODO: If we're not on the main site and we're on the client, warn
	return tenant;
}
