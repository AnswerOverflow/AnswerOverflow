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
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { resolveScrollTarget } from "../utils/scroll-target";

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
	/** Stable id per item, required for `registerScroller` to find an item. */
	getItemId?: (item: Item) => string;
	/**
	 * Hands the caller a function that scrolls an item into view by id, loading
	 * further pages until the item is found. Returns a cleanup function.
	 */
	registerScroller?: (scroller: (itemId: string) => boolean) => () => void;
	/**
	 * Called once the scrolled-to item has rendered. Return false to be called
	 * again on the next frame, e.g. while waiting for the element to mount.
	 */
	onScrolledToItem?: (itemId: string) => boolean;
};

const SCROLL_RENDER_ATTEMPTS = 30;

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
	getItemId,
	registerScroller,
	onScrolledToItem,
}: SnapshotInfiniteListProps<Item>) {
	const generationRef = useRef(0);
	const virtuosoRef = useRef<VirtuosoHandle>(null);
	const pendingScrollIdRef = useRef<string | null>(null);
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

	const loadNextPage = useEffectEvent(() => {
		if (!canLoadMore || continueCursor === null) {
			return;
		}
		setIsLoadingMore(true);
		void fetchPage({
			cursor: continueCursor,
			numItems: pageSize,
			append: true,
			generation: generationRef.current,
		});
	});

	const scrollToItemIndex = useEffectEvent((index: number, itemId: string) => {
		virtuosoRef.current?.scrollToIndex({
			index,
			align: "center",
			behavior: "auto",
		});
		if (!onScrolledToItem) {
			return;
		}
		// The item mounts a frame or two after Virtuoso scrolls to it.
		let attempts = SCROLL_RENDER_ATTEMPTS;
		const tick = () => {
			if (onScrolledToItem(itemId) || attempts-- <= 0) {
				return;
			}
			requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);
	});

	const scrollToItem = useEffectEvent((itemId: string) => {
		if (!getItemId) {
			return false;
		}
		const resolution = resolveScrollTarget({
			items: results,
			getItemId,
			targetId: itemId,
			isDone,
		});
		if (resolution.type === "scroll") {
			pendingScrollIdRef.current = null;
			scrollToItemIndex(resolution.index, itemId);
			return true;
		}
		if (resolution.type === "unreachable") {
			return false;
		}
		// Not paged in yet, keep loading until it shows up.
		pendingScrollIdRef.current = itemId;
		loadNextPage();
		return true;
	});

	useEffect(() => {
		if (!registerScroller) {
			return;
		}
		return registerScroller(scrollToItem);
	}, [registerScroller]);

	useEffect(() => {
		const pending = pendingScrollIdRef.current;
		if (pending === null || !getItemId) {
			return;
		}
		const resolution = resolveScrollTarget({
			items: results,
			getItemId,
			targetId: pending,
			isDone,
		});
		if (resolution.type === "scroll") {
			pendingScrollIdRef.current = null;
			scrollToItemIndex(resolution.index, pending);
			return;
		}
		if (resolution.type === "unreachable") {
			pendingScrollIdRef.current = null;
			return;
		}
		loadNextPage();
	}, [results, isDone, getItemId]);

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
			ref={virtuosoRef}
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
