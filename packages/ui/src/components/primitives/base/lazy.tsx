/*
    For any async components we don't want to block the entire page from loading
    wrap them with this component and they will be loaded lazily
 */
import { Suspense } from 'react';
// Doesn't work, need to revisit
export function Lazy(props: {
	load: () => React.ReactNode;
	fallback?: React.ReactNode;
}) {
	return <Suspense fallback={props.fallback}>{props.load()}</Suspense>;
}
