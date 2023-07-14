import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { botRouter, appRouter } from '../router';
export type BotRouter = typeof botRouter;
export type AppRouter = typeof appRouter;
export type BotRouterCaller = ReturnType<BotRouter['createCaller']>;
export type BotRouterInput = inferRouterInputs<BotRouter>;
export type BotRouterOutput = inferRouterOutputs<BotRouter>;
export type AppRouterOutput = inferRouterOutputs<AppRouter>;
export type ChannelFindByIdOutput = BotRouterOutput['channels']['byId'];
export type APISearchResult = AppRouterOutput['messages']['search'];
export type {
	MessageWithDiscordAccount as APIMessageWithDiscordAccount,
	MessageFull as APIMessageFull,
} from '@answeroverflow/db';
import { PermissionFlagsBits } from 'discord-api-types/v10';
import { BitField, enumToObject, ValueResolvable } from '@sapphire/bitfield';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const PermissionsBitField = new BitField(
	enumToObject(PermissionFlagsBits),
);
export type PermissionResolvable = ValueResolvable<typeof PermissionsBitField>;

// TODO: Move these to zod validation
export type DomainVerificationStatusProps =
	| 'Valid Configuration'
	| 'Invalid Configuration'
	| 'Pending Verification'
	| 'Domain Not Found'
	| 'Unknown Error';

// From https://vercel.com/docs/rest-api/endpoints#get-a-project-domain
export interface DomainResponse {
	name: string;
	apexName: string;
	projectId: string;
	redirect?: string | null;
	redirectStatusCode?: (307 | 301 | 302 | 308) | null;
	gitBranch?: string | null;
	updatedAt?: number;
	createdAt?: number;
	/** `true` if the domain is verified for use with the project. If `false` it will not be used as an alias on this project until the challenge in `verification` is completed. */
	verified: boolean;
	/** A list of verification challenges, one of which must be completed to verify the domain for use on the project. After the challenge is complete `POST /projects/:idOrName/domains/:domain/verify` to verify the domain. Possible challenges: - If `verification.type = TXT` the `verification.domain` will be checked for a TXT record matching `verification.value`. */
	verification: {
		type: string;
		domain: string;
		value: string;
		reason: string;
	}[];
}

// From https://vercel.com/docs/rest-api/endpoints#get-a-domain-s-configuration
export interface DomainConfigResponse {
	/** How we see the domain's configuration. - `CNAME`: Domain has a CNAME pointing to Vercel. - `A`: Domain's A record is resolving to Vercel. - `http`: Domain is resolving to Vercel but may be behind a Proxy. - `null`: Domain is not resolving to Vercel. */
	configuredBy?: ('CNAME' | 'A' | 'http') | null;
	/** Which challenge types the domain can use for issuing certs. */
	acceptedChallenges?: ('dns-01' | 'http-01')[];
	/** Whether or not the domain is configured AND we can automatically generate a TLS certificate. */
	misconfigured: boolean;
}

// From https://vercel.com/docs/rest-api/endpoints#verify-project-domain
export interface DomainVerificationResponse {
	name: string;
	apexName: string;
	projectId: string;
	redirect?: string | null;
	redirectStatusCode?: (307 | 301 | 302 | 308) | null;
	gitBranch?: string | null;
	updatedAt?: number;
	createdAt?: number;
	/** `true` if the domain is verified for use with the project. If `false` it will not be used as an alias on this project until the challenge in `verification` is completed. */
	verified: boolean;
	/** A list of verification challenges, one of which must be completed to verify the domain for use on the project. After the challenge is complete `POST /projects/:idOrName/domains/:domain/verify` to verify the domain. Possible challenges: - If `verification.type = TXT` the `verification.domain` will be checked for a TXT record matching `verification.value`. */
	verification?: {
		type: string;
		domain: string;
		value: string;
		reason: string;
	}[];
}
