'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
export const useNavigationEvent = (props: {
	onChange: (url: string) => void;
}) => {
	const pathname = usePathname();
	const searchParams = useSearchParams();

	useEffect(() => {
		const url = `${pathname}?${searchParams as unknown as string}`;
		props.onChange(url);
	}, [pathname, searchParams]);

	return null;
};
