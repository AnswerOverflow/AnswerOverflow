/*
  Main Site Info:
  host: "www.answeroverflow.com"
  hostname: "www.answeroverflow.com"
  href: "https://www.answeroverflow.com/"
  origin: "https://www.answeroverflow.com"
*/
import { createContext, useContext } from 'react';
import type { ServerPublic } from '@answeroverflow/api';

const TenantContext = createContext<ServerPublic | undefined>(undefined);

export const TenantContextProvider = TenantContext.Provider;

export function useTenantContext():
	| {
			isOnTenantSite: true;
			tenant: ServerPublic;
	  }
	| {
			isOnTenantSite: false;
			tenant: undefined;
	  } {
	const tenant = useContext(TenantContext);
	// TODO: If we're not on the main site and we're on the client, warn
	const isOnTenantSite = tenant !== undefined;
	if (isOnTenantSite) {
		return {
			tenant,
			isOnTenantSite: true,
		};
	}
	return {
		tenant: undefined,
		isOnTenantSite: false,
	};
}
