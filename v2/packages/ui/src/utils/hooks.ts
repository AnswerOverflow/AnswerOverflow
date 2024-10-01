'use client';
import { useSearchParams } from 'next/navigation';

export const useRouterQuery = () => {
	const searchParams = useSearchParams();
	return searchParams?.get('q');
};

export const useRouterServerId = () => {
	const searchParams = useSearchParams();
	return searchParams?.get('s');
};
