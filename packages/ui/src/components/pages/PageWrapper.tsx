import { Navbar } from '../primitives/navbar/Navbar';
import { Footer } from '../primitives/Footer';
import { useRouter } from 'next/navigation';
import { webClientEnv } from '@answeroverflow/env/web';

export interface PageWrapperProps extends React.PropsWithChildren {
	/**
	 * @example ['/', ["/foo"]]
	 */
	disabledRoutes?: string[];
}

export const PageWrapper = ({
	children,
	disabledRoutes = [],
}: PageWrapperProps) => {
	const router = useRouter();

	// Check if running in storybook
	if (webClientEnv.NEXT_PUBLIC_LADLE) {
		return <PageWrapperRenderer>{children}</PageWrapperRenderer>;
	} else {
		if (disabledRoutes?.includes(router.pathname)) {
			return <>{children}</>;
		} else {
			return <PageWrapperRenderer>{children}</PageWrapperRenderer>;
		}
	}
};

export const PageWrapperRenderer = ({ children }: PageWrapperProps) => {
	return (
		<div className="mx-auto flex w-full flex-col items-center overflow-x-hidden overflow-y-scroll bg-background font-body scrollbar-hide">
			<div className="w-full max-w-screen-2xl justify-center">
				<Navbar />
				{webClientEnv.NEXT_PUBLIC_LADLE ? (
					<div className="px-4 sm:px-[4rem] 2xl:px-[6rem]">{children}</div>
				) : (
					<main className="px-4 sm:px-[4rem] 2xl:px-[6rem]">{children}</main>
				)}
				<Footer />
			</div>
		</div>
	);
};
