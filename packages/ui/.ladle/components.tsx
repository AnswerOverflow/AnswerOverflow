import './styles.css';
import type { GlobalProvider } from '@ladle/react';
import {
	WithAnalytics,
	WithAuth,
	WithHighlightJS,
	WithNextRouter,
	WithTailwindTheme,
} from './decorators';
import { GlobalStateProvider } from './global-state';
import React from 'react';

export const Provider: GlobalProvider = ({ children, globalState }) => {
	return (
			<GlobalStateProvider value={globalState}>
				<WithNextRouter>
					<WithAuth authState="signedIn">
						<WithTailwindTheme>
							<WithHighlightJS>
								<WithAnalytics>{children}</WithAnalytics>
							</WithHighlightJS>
						</WithTailwindTheme>
					</WithAuth>
				</WithNextRouter>
			</GlobalStateProvider>
	);
};
