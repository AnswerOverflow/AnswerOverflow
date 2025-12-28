import type { Auth, UserIdentity } from "convex/server";
import { Effect, Option, pipe } from "effect";

export interface ConfectAuth {
	getUserIdentity(): Effect.Effect<Option.Option<UserIdentity>>;
}

export class ConfectAuthImpl implements ConfectAuth {
	constructor(private auth: Auth) {}
	getUserIdentity(): Effect.Effect<Option.Option<UserIdentity>> {
		return pipe(
			Effect.promise(() => this.auth.getUserIdentity()),
			Effect.map(Option.fromNullable),
		);
	}
}
