import type { Session } from 'inspector';
import type { AppType } from 'next/app';

// eslint-disable-next-line @typescript-eslint/naming-convention
const MyApp: AppType<{ session: Session | null }> = ({
	Component,
	pageProps: { ...pageProps },
}) => {
	return <Component {...pageProps} />;
};

export default MyApp;
