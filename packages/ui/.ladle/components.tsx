import './styles.css';
import './code.scss';
import type { ArgTypes, GlobalProvider } from '@ladle/react';
import {
	WithAnalytics,
	WithAuth,
	WithHighlightJS,
	WithNextRouter,
	WithTailwindTheme,
} from './decorators';
import { GlobalStateProvider } from './global-state';
import React, { ReactDOM } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Button } from '~ui/components/primitives/ui/button';
import { AiOutlineHome, AiOutlineShop } from 'react-icons/ai';
import { TenantContextProvider } from '@answeroverflow/hooks';
import { mockServer } from '~ui/test/props';

export const Provider: GlobalProvider = ({ children, globalState }) => {
	const [isOnTenantSite, setIsOnTenantSite] = React.useState(false);
	return (
		<div className={'relative m-0 h-full p-0'}>
			<GlobalStateProvider value={globalState}>
				<WithTailwindTheme>
					<WithNextRouter>
						<TenantContextProvider
							value={isOnTenantSite ? mockServer() : undefined}
						>
							<WithAuth authState="signedIn">
								<WithHighlightJS>
									<ToastContainer toastClassName="bg-background dark:bg-background text-primary dark:text-primary" />

									<WithAnalytics>
										<div className={'bg-background'}>{children}</div>
									</WithAnalytics>
								</WithHighlightJS>
							</WithAuth>
						</TenantContextProvider>
					</WithNextRouter>
					<div className={'absolute bottom-0 right-0'}>
						<Button
							size={'icon'}
							variant={'outline'}
							onClick={() => setIsOnTenantSite(!isOnTenantSite)}
						>
							{isOnTenantSite ? (
								<AiOutlineShop className={'h-6 w-6'} />
							) : (
								<AiOutlineHome className={'h-6 w-6'} />
							)}
							<span className={'sr-only'}>
								Toggle between tenant and non-tenant site
							</span>
						</Button>
					</div>
				</WithTailwindTheme>
			</GlobalStateProvider>
		</div>
	);
};
