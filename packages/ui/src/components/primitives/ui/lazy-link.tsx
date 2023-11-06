'use client';
import dynamic from 'next/dynamic';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const PrefetchLink = dynamic(() => import('next/link'), {
	ssr: false,
});
