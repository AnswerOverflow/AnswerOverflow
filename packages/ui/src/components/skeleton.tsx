"use client";

import { cn } from "@packages/ui/lib/utils";
import {
	type CSSProperties,
	cloneElement,
	createContext,
	type ReactElement,
	type ReactNode,
	type Ref,
	useCallback,
	useContext,
	useRef,
} from "react";

export const SkeletonContext = createContext<boolean>(false);

export function useIsSkeleton(): boolean {
	return useContext(SkeletonContext);
}

export function useLoadingAnimation(
	isAnimating: boolean,
): (element: HTMLElement | null) => void {
	const animationRef = useRef<Animation | null>(null);
	const prefersReducedMotion =
		typeof window !== "undefined" &&
		window.matchMedia("(prefers-reduced-motion: reduce)").matches;

	return useCallback(
		(element: HTMLElement | null) => {
			if (
				isAnimating &&
				!animationRef.current &&
				element &&
				!prefersReducedMotion &&
				typeof element.animate === "function"
			) {
				animationRef.current = element.animate(
					[{ backgroundPosition: "100%" }, { backgroundPosition: "0%" }],
					{
						duration: 2000,
						iterations: Number.POSITIVE_INFINITY,
						easing: "ease-in-out",
					},
				);
				animationRef.current.startTime = 0;
			} else if (!isAnimating && animationRef.current) {
				animationRef.current.cancel();
				animationRef.current = null;
			}
		},
		[isAnimating, prefersReducedMotion],
	);
}

export interface SkeletonProviderProps {
	children: ReactNode;
	isLoading: boolean;
}

export function SkeletonProvider({
	children,
	isLoading,
}: SkeletonProviderProps): ReactNode {
	return (
		<SkeletonContext.Provider value={isLoading}>
			{children}
		</SkeletonContext.Provider>
	);
}

export const loadingClassName =
	"skeleton-loading bg-[length:300%] bg-gradient-to-r from-accent via-muted to-accent [&_*]:invisible";

export type SkeletonElement = ReactElement<{
	children?: ReactNode;
	className?: string;
	ref?: Ref<HTMLElement>;
	inert?: boolean | "true";
}>;

function mergeRefs<T>(
	...refs: Array<Ref<T> | undefined | null>
): (instance: T | null) => void {
	return (instance: T | null) => {
		for (const ref of refs) {
			if (typeof ref === "function") {
				ref(instance);
			} else if (ref && typeof ref === "object") {
				(ref as React.MutableRefObject<T | null>).current = instance;
			}
		}
	};
}

export function SkeletonWrapper({
	children,
}: {
	children: SkeletonElement;
}): ReactNode {
	const isLoading = useContext(SkeletonContext);
	const animation = useLoadingAnimation(isLoading);

	if (!isLoading) {
		return children;
	}

	const childRef =
		"ref" in children && !Object.getOwnPropertyDescriptor(children, "ref")?.get
			? (children.ref as Ref<HTMLElement>)
			: (children.props.ref as Ref<HTMLElement> | undefined);

	return (
		<SkeletonContext.Provider value={false}>
			{cloneElement(children, {
				ref: mergeRefs(childRef, animation),
				className: cn(children.props.className, loadingClassName, "rounded-md"),
				inert: true,
			})}
		</SkeletonContext.Provider>
	);
}

export function useSkeletonText(
	children: ReactNode,
	style: CSSProperties | undefined,
): [ReactNode, CSSProperties | undefined] {
	const isSkeleton = useContext(SkeletonContext);
	if (isSkeleton) {
		return [
			<SkeletonText key="skeleton-text">{children}</SkeletonText>,
			{
				...style,
				WebkitTextFillColor: "transparent",
			},
		];
	}
	return [children, style];
}

export function SkeletonText({ children }: { children: ReactNode }): ReactNode {
	const animation = useLoadingAnimation(true);
	return (
		<span
			inert
			ref={animation}
			className={cn(
				loadingClassName,
				"text-transparent box-decoration-clone rounded-sm",
			)}
		>
			{children}
		</span>
	);
}

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="skeleton"
			className={cn("bg-accent animate-pulse rounded-md", className)}
			{...props}
		/>
	);
}

export const SkeletonBox = Skeleton;
