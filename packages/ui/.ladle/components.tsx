import './styles.css';
import type { ArgTypes, GlobalProvider } from '@ladle/react';
import {
	WithAnalytics,
	WithAuth,
	WithHighlightJS,
	WithNextRouter,
	WithTailwindTheme,
} from './decorators';
import { GlobalStateProvider } from './global-state';
import React from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const Provider: GlobalProvider = ({ children, globalState }) => {
	return (
		<GlobalStateProvider value={globalState}>
			<WithNextRouter>
				<WithAuth authState="signedIn">
					<WithTailwindTheme>
						<WithHighlightJS>
							<ToastContainer toastClassName="dark:bg-ao-black dark:text-white bg-white text-black" />

							<WithAnalytics>{children}</WithAnalytics>
						</WithHighlightJS>
					</WithTailwindTheme>
				</WithAuth>
			</WithNextRouter>
		</GlobalStateProvider>
	);
};
