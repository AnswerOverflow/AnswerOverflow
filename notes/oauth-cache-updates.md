# OAuth Cache Updates - Future Implementation

The old AnswerOverflow codebase maintains an OAuth session cache that tracks which Discord servers a user has access to. This cache is updated in real-time as users join/leave servers, enabling the dashboard to know which servers a logged-in user can manage.

## Missing Functionality

The current rewrite does NOT implement these OAuth cache updates. This should be implemented when the authentication/dashboard system is fully integrated.

### On User Join Server (`guildMemberAdd`)

```typescript
// Old implementation in cache-parity.ts
const account = await Auth.findDiscordOauthByProviderAccountId(member.user.id);
if (!account || !account.access_token) return;
await Auth.addServerToUserServerCache({
  accessToken: account.access_token,
  server: toDiscordAPIServer(member),
});
```

### On User Leave Server (`guildMemberRemove`)

```typescript
// Old implementation in cache-parity.ts
const account = await Auth.findDiscordOauthByProviderAccountId(member.user.id);
if (!account || !account.access_token) return;
await Auth.removeServerFromUserCache({
  accessToken: account.access_token,
  serverId: guild.id,
});
```

### On User Profile Update (`userUpdate`)

```typescript
// Old implementation in cache-parity.ts
const account = await Auth.findDiscordOauthByProviderAccountId(newUser.id);
if (!account || !account.access_token) return;
await Auth.updateCachedDiscordUser(account.access_token, {
  ...account,
  avatar: newUser.avatar,
  username: newUser.displayName,
  discriminator: newUser.discriminator,
});
```

## Purpose

This cache serves to:
1. Allow the dashboard to quickly show which servers a user can manage without re-fetching from Discord API
2. Keep server lists in sync when users join/leave servers while logged in
3. Update user profile information (avatar, username) when changed on Discord

## Implementation Notes

- Requires integration with Better Auth or whatever auth system is used
- Should be implemented in `apps/discord-bot/src/sync/user.ts`
- Analytics tracking for `User Joined Server` and `User Left Server` events is separate and has been implemented
- The OAuth cache updates should be added alongside those analytics calls when auth is ready

## Reference

See old codebase: `.context/AnswerOverflow/apps/discord-bot/src/listeners/parity/cache-parity.ts`
