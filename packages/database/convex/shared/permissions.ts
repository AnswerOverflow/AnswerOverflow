import type { Brand } from "effect/Brand";
import type { UserServerSettings } from "../schema";

export type CanEditServer = Brand<"CanEditServer">;

export type IsAdminOrOwner = Brand<"IsAdminOrOwner">;

export type CanManageChannels = Brand<"CanManageChannels">;

export type IsAuthenticated = Brand<"IsAuthenticated">;

export type AuthorizedUser<P> = {
	readonly discordAccountId: string;
	readonly userServerSettings: UserServerSettings | null;
} & P;
