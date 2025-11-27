import { ConvexClient } from "convex/browser";
import type { FunctionReference } from "convex/server";
import { Config, Context, Effect, Layer } from "effect";
import { api, internal } from "../convex/_generated/api";
import {
	type ConvexClientShared,
	ConvexClientUnified,
	ConvexError,
	type WrappedUnifiedClient,
} from "./convex-unified-client";

let jwt: string | null = null;
async function getConvexJwt() {
	if (jwt) {
		return jwt;
	}
	console.log("getting convex jwt");
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
	console.log("response", response);
	const cookieHeader =
		response.headers
			.getSetCookie?.()
			.find((c) => c.startsWith("better-auth.convex_jwt=")) ??
		response.headers.get("set-cookie");
	console.log("cookieHeader", cookieHeader);
	if (!cookieHeader?.startsWith("better-auth.convex_jwt=")) {
		return null;
	}
	jwt = cookieHeader.split(";")[0]?.split("=")[1] ?? null;
	console.log("jwt", jwt);
	return jwt;
}

const createLiveService = Effect.gen(function* () {
	const convexUrl = yield* Config.string("CONVEX_URL");
	const client = new ConvexClient(convexUrl);

	// TODO: Use some persistent session and also create this sooner or have better bypasses, maybe keep the backendToken bypass logic, but have this as a fallback when the user is signed out
	client.setAuth(getConvexJwt, (isAuthed) => console.log("isAuthed", isAuthed));

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
