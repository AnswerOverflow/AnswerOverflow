import { ServerPublic } from '@answeroverflow/api/index';
import { createContext, useContext } from 'react';

export const TenantContext = createContext<{
	tenant: ServerPublic | null;
}>({
	tenant: null,
});

export function useTenant() {
	const context = useContext(TenantContext);
	return context.tenant;
}
