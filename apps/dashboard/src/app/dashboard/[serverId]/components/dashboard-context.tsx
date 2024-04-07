import type { ServerDashboard } from '@answeroverflow/api';
import { createContext, useContext } from 'react';

// eslint-disable-next-line @typescript-eslint/naming-convention
const DashboardContext = createContext<
	| {
			server: ServerDashboard;
			options: {
				serverId: string;
				from: Date;
				to: Date;
			};
	  }
	| undefined
>(undefined);

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
