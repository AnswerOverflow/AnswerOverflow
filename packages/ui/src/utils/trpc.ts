// src/utils/trpc.ts
import { createTRPCNext } from "@trpc/next";
import { httpBatchLink, loggerLink } from "@trpc/client";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@answeroverflow/api";
import { transformer } from "@answeroverflow/api/transformer";
import { createTRPCReact } from "@trpc/react-query";

const getBaseUrl = () => {
	if (typeof window !== "undefined") return ""; // browser should use relative url
	if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`; // SSR should use vercel url
	return `http://localhost:${process.env.PORT ?? 3000}`; // dev SSR should use localhost
};

const nextTRPC = () =>
	createTRPCNext<AppRouter>({
		config() {
			return {
				transformer,
				links: [
					loggerLink({
						enabled: (opts) =>
							process.env.NODE_ENV === "development" ||
							(opts.direction === "down" && opts.result instanceof Error)
					}),
					httpBatchLink({
						url: `${getBaseUrl()}/api/trpc`
					})
				]
			};
		},
		ssr: false
	});

const storybookTRPC = () => createTRPCReact<AppRouter>();
export type StorybookTRPC = ReturnType<typeof storybookTRPC>;
export type NextTRPC = ReturnType<typeof nextTRPC>;

// eslint-disable-next-line no-constant-condition
export const trpc = process.env.STORYBOOK ? storybookTRPC() : nextTRPC();

/**
 * Inference helpers for input types
 * @example type HelloInput = RouterInputs['example']['hello']
 **/
export type RouterInputs = inferRouterInputs<AppRouter>;

/**
 * Inference helpers for output types
 * @example type HelloOutput = RouterOutputs['example']['hello']
 **/
export type RouterOutputs = inferRouterOutputs<AppRouter>;
