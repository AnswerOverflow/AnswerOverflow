'use client';
import dynamic from 'next/dynamic';

export const PrefetchLink = dynamic(() => import('next/link'), {
	ssr: false,
});
