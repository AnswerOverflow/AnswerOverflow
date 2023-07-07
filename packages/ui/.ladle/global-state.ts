import type { GlobalProvider } from '@ladle/react';
import React from 'react';

export type GlobalState = Parameters<GlobalProvider>[0]['globalState'];

const GlobalStateContext = React.createContext<GlobalState | null>(null);

export const useGlobalState = () => {
	const globalState = React.useContext(GlobalStateContext);
	if (!globalState) {
		throw new Error('useGlobalState must be used within a GlobalProvider');
	}
	return globalState;
};

export const GlobalStateProvider = GlobalStateContext.Provider;
