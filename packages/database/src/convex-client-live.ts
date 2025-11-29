import { ConvexClient } from "convex/browser";
import type { FunctionReference } from "convex/server";
import { parse } from "cookie";
import { Config, Context, Effect, Layer } from "effect";
import { api, internal } from "../convex/_generated/api";
import {
	type ConvexClientShared,
	ConvexClientUnified,
	ConvexError,
	type WrappedUnifiedClient,
} from "./convex-unified-client";

const JWT_COOKIE_NAMES = [
	"better-auth.convex_jwt",
	"__Secure-better-auth.convex_jwt",
] as const;

function extractJwtFromCookie(setCookieString: string) {
	const nameValuePart = setCookieString.split(";")[0];
	if (!nameValuePart) return null;
	const parsed = parse(nameValuePart);
	for (const name of JWT_COOKIE_NAMES) {
		if (parsed[name])
			return {
				name: name,
				value: parsed[name],
			};
	}
	return null;
}

let cachedJwt: string | null = null;

export function getConvexJwtFromHeaders(cookies: string[]) {
	for (const cookie of cookies) {
		const extracted = extractJwtFromCookie(cookie);
		if (extracted) {
			return extracted;
		}
	}

	return null;
}

async function getConvexJwt(): Promise<string | null> {
	if (cachedJwt) return cachedJwt;

	const response = await fetch(
		`${process.env.SITE_URL}/api/auth/sign-in/anonymous`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Cookie: "auth-bypass=true",
			},
			body: JSON.stringify({ redirectTo: "/" }),
		},
	);

	const headers = response.headers;
	const jwt = getConvexJwtFromHeaders(
		headers.getSetCookie?.() ?? headers.get("set-cookie")?.split(", ") ?? [],
	);
	if (jwt) {
		cachedJwt = jwt.value;
	}

	return null;
}

const createLiveService = Effect.gen(function* () {
	const convexUrl = yield* Config.string("NEXT_PUBLIC_CONVEX_URL");
	const client = new ConvexClient(convexUrl);

	const wrappedClient: ConvexClientShared = {
		query: client.query.bind(client),
		mutation: <Mutation extends FunctionReference<"mutation">>(
			mutation: Mutation,
			args: Parameters<ConvexClient["mutation"]>[1],
			options?: Parameters<ConvexClient["mutation"]>[2],
		) => {
			return client.mutation(mutation, args, options);
		},
		action: client.action.bind(client),
		onUpdate: client.onUpdate.bind(client),
	};

	const use = <A>(
		fn: (
			client: ConvexClientShared,
			convexApi: {
				api: typeof api;
				internal: typeof internal;
			},
		) => A | Promise<A>,
	) => {
		return Effect.tryPromise({
			async try(): Promise<Awaited<A>> {
				const result = await fn(wrappedClient, { api, internal });
				return result as Awaited<A>;
			},
			catch(cause) {
				return new ConvexError({ cause });
			},
		}).pipe(Effect.withSpan("use_convex_live_client")) as Effect.Effect<
			Awaited<A>,
			ConvexError
		>;
	};

	return { use, client: wrappedClient };
});

export class ConvexClientLive extends Context.Tag("ConvexClientLive")<
	ConvexClientLive,
	Effect.Effect.Success<typeof createLiveService>
>() {}

const ConvexClientLiveSharedLayer = Layer.effectContext(
	Effect.gen(function* () {
		const service = yield* createLiveService;
		const unifiedService: WrappedUnifiedClient = {
			client: service.client,
			use: service.use,
		};
		return Context.make(ConvexClientLive, service).pipe(
			Context.add(ConvexClientUnified, unifiedService),
		);
	}),
);

export const ConvexClientLiveLayer = Layer.service(ConvexClientLive).pipe(
	Layer.provide(ConvexClientLiveSharedLayer),
);

export const ConvexClientLiveUnifiedLayer = Layer.service(
	ConvexClientUnified,
).pipe(Layer.provide(ConvexClientLiveSharedLayer));
