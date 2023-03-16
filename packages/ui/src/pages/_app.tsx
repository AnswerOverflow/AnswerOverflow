import type { AppType } from 'next/dist/shared/lib/utils';

import '../styles/globals.css';

// eslint-disable-next-line @typescript-eslint/naming-convention
const MyApp: AppType = ({ Component, pageProps }) => {
	return <Component {...pageProps} />;
};

export default MyApp;
