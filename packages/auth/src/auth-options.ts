import type { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { extendedAdapter } from "./adapter";

export const authOptions: NextAuthOptions = {
	// Configure one or more authentication providers
	adapter: extendedAdapter,
	providers: [
		DiscordProvider({
			clientId: process.env.DISCORD_CLIENT_ID,
			clientSecret: process.env.DISCORD_CLIENT_SECRET,
			authorization: "https://discord.com/api/oauth2/authorize?scope=identify+email+guilds"
		})
		// ...add more providers here
	],
	callbacks: {
		session({ session, user }) {
			if (session.user) {
				session.user.id = user.id;
			}
			return session;
		}
	}
};
