import type { ServerDashboard } from '@answeroverflow/api';
import { createContext, useContext } from 'react';

// eslint-disable-next-line @typescript-eslint/naming-convention
const DashboardContext = createContext<ServerDashboard | undefined>(undefined);

export const DashboardProvider = DashboardContext.Provider;

export const useDashboardContext = () => {
	const context = useContext(DashboardContext);
	if (!context) {
		throw new Error(
			'useDashboardContext must be used within a DashboardProvider',
		);
	}
	return context;
};
