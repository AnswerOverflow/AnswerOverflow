'use client';

import dynamic from 'next/dynamic';

// Dynamic import since we have no need to SSR and it causes hydration errors
// eslint-disable-next-line @typescript-eslint/naming-convention
const ClientOnlyComponent = dynamic(() => import('./client'), { ssr: false });

export default function Dashboard() {
	return <ClientOnlyComponent />;
}
