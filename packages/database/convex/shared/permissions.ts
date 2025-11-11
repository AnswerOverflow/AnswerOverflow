import type { Brand } from "effect/Brand";
import type { UserServerSettings } from "../schema";

/**
 * Permission brands for type-level permission enforcement.
 * These brands prove that a permission check has been performed.
 */

/**
 * Brand for users who can edit server settings.
 * Requires Administrator or ManageGuild permission.
 */
export type CanEditServer = Brand<"CanEditServer">;

/**
 * Brand for users who are admin or owner of a server.
 * Requires Administrator permission or server ownership.
 */
export type IsAdminOrOwner = Brand<"IsAdminOrOwner">;

/**
 * Brand for users who can manage channels.
 * Typically requires ManageChannels permission or higher.
 */
export type CanManageChannels = Brand<"CanManageChannels">;

/**
 * Brand for authenticated users (basic auth check).
 */
export type IsAuthenticated = Brand<"IsAuthenticated">;

/**
 * Branded authorized user type that carries permission proofs.
 * The permission brand proves that the permission check was performed.
 */
export type AuthorizedUser<P> = {
	readonly discordAccountId: string;
	readonly userServerSettings: UserServerSettings | null;
} & P;
