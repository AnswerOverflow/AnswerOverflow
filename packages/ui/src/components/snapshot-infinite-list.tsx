"use client";

import {
	type ReactNode,
	useCallback,
	useEffect,
	useEffectEvent,
	useMemo,
	useRef,
	useState,
} from "react";
import { Virtuoso } from "react-virtuoso";

type SnapshotPage<Item> = {
	page: Array<Item>;
	isDone: boolean;
	continueCursor: string;
};

type SnapshotInfiniteListProps<Item> = {
	loadPage: (args: {
		cursor: string | null;
		numItems: number;
	}) => Promise<SnapshotPage<Item>>;
	pageSize?: number;
	renderItem: (item: Item, index: number) => ReactNode;
	loader: ReactNode;
	initialLoaderCount?: number;
	loadMoreLoaderCount?: number;
	emptyState?: ReactNode;
	footer?: ReactNode;
	className?: string;
	itemClassName?: string;
	initialData?: SnapshotPage<Item>;
	filterResults?: (items: Array<Item>) => Array<Item>;
};

function LoadingSkeletons({
	count,
	loader,
}: {
	count: number;
	loader: ReactNode;
}) {
	return (
		<div className="space-y-4">
			{Array.from({ length: count }).map((_, i) => (
				<div key={`loader-${i}`}>{loader}</div>
			))}
		</div>
	);
}

export function SnapshotInfiniteList<Item>({
	loadPage,
	pageSize = 30,
	renderItem,
	loader: loaderElement,
	initialLoaderCount = 5,
	loadMoreLoaderCount = 3,
	emptyState,
	footer,
	className,
	itemClassName = "mb-4",
	initialData,
	filterResults,
}: SnapshotInfiniteListProps<Item>) {
	const generationRef = useRef(0);
	const lastLoadedLength = useRef(0);
	const [pages, setPages] = useState<Array<SnapshotPage<Item>>>(() =>
		initialData ? [initialData] : [],
	);
	const [isLoadingFirstPage, setIsLoadingFirstPage] = useState(
		initialData === undefined,
	);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [isDone, setIsDone] = useState(initialData?.isDone ?? false);
	const [continueCursor, setContinueCursor] = useState<string | null>(
		initialData?.continueCursor ?? null,
	);
	const [error, setError] = useState<Error | null>(null);

	const fetchPage = useEffectEvent(
		async (request: {
			cursor: string | null;
			numItems: number;
			append: boolean;
			generation: number;
		}) => {
			try {
				const result = await loadPage({
					cursor: request.cursor,
					numItems: request.numItems,
				});

				if (generationRef.current !== request.generation) {
					return;
				}

				setPages((currentPages) =>
					request.append ? [...currentPages, result] : [result],
				);
				setIsDone(result.isDone);
				setContinueCursor(result.continueCursor);
				setError(null);
			} catch (caughtError) {
				if (generationRef.current !== request.generation) {
					return;
				}

				setError(
					caughtError instanceof Error
						? caughtError
						: new Error("Failed to load paginated query"),
				);
			} finally {
				if (generationRef.current === request.generation) {
					if (request.append) {
						setIsLoadingMore(false);
					} else {
						setIsLoadingFirstPage(false);
					}
				}
			}
		},
	);

	useEffect(() => {
		generationRef.current += 1;
		const generation = generationRef.current;
		lastLoadedLength.current = 0;
		setError(null);

		if (initialData) {
			setPages([initialData]);
			setIsDone(initialData.isDone);
			setContinueCursor(initialData.continueCursor);
			setIsLoadingFirstPage(false);
			setIsLoadingMore(false);
			return;
		}

		setPages([]);
		setIsDone(false);
		setContinueCursor(null);
		setIsLoadingFirstPage(true);
		setIsLoadingMore(false);

		void fetchPage({
			cursor: null,
			numItems: pageSize,
			append: false,
			generation,
		});
	}, [initialData, pageSize]);

	const rawResults = useMemo(() => pages.flatMap((page) => page.page), [pages]);
	const results = filterResults ? filterResults(rawResults) : rawResults;

	const canLoadMore = !isLoadingFirstPage && !isLoadingMore && !isDone;

	const handleRangeChanged = useCallback(
		(range: { startIndex: number; endIndex: number }) => {
			if (!canLoadMore || continueCursor === null) {
				return;
			}

			if (results.length > lastLoadedLength.current) {
				lastLoadedLength.current = results.length;
			}

			const loadMoreThreshold = Math.max(
				lastLoadedLength.current - Math.min(pageSize, 5),
				0,
			);
			if (range.endIndex >= loadMoreThreshold) {
				lastLoadedLength.current = results.length + pageSize;
				setIsLoadingMore(true);
				const generation = generationRef.current;
				void fetchPage({
					cursor: continueCursor,
					numItems: pageSize,
					append: true,
					generation,
				});
			}
		},
		[canLoadMore, continueCursor, fetchPage, pageSize, results],
	);

	if (error) {
		throw error;
	}

	const hasResults = results.length > 0;
	const isInitialLoading = isLoadingFirstPage && !initialData;
	const isEmpty = isDone && !hasResults;

	if (isInitialLoading) {
		return (
			<LoadingSkeletons count={initialLoaderCount} loader={loaderElement} />
		);
	}

	if (isEmpty && emptyState) {
		return (
			<>
				{emptyState}
				{footer}
			</>
		);
	}

	if (!hasResults) {
		return (
			<LoadingSkeletons count={initialLoaderCount} loader={loaderElement} />
		);
	}

	return (
		<Virtuoso
			useWindowScroll
			data={results}
			className={className}
			rangeChanged={handleRangeChanged}
			overscan={200}
			itemContent={(index, item) => (
				<div className={itemClassName}>{renderItem(item, index)}</div>
			)}
			components={{
				Footer: () => (
					<>
						{(isLoadingMore || canLoadMore) && (
							<LoadingSkeletons
								count={loadMoreLoaderCount}
								loader={loaderElement}
							/>
						)}
						{isDone && footer}
						<div className="hidden sm:block h-16" aria-hidden="true" />
					</>
				),
			}}
		/>
	);
}
