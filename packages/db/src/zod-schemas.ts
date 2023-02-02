import { z } from "zod";
import { channel_settings_flags } from "../../prisma/src/channel-settings";
import { server_settings_flags } from "../../prisma/src/server_settings";
import { toDict } from "./utils/bitfield";
import { ChannelType } from "discord-api-types/v10";
import { user_server_settings_flags } from "../../prisma/src/user-server-settings";

export const ALLOWED_THREAD_TYPES = new Set([
  ChannelType.PublicThread,
  ChannelType.AnnouncementThread,
]);

export const ALLOWED_CHANNEL_TYPES = new Set([
  ChannelType.GuildForum,
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
  ...ALLOWED_THREAD_TYPES,
]);

export function toZObject<T extends readonly string[]>(
  ...keys: T
): z.ZodObject<Record<T[number], z.ZodOptional<z.ZodBoolean>>> {
  return z.object(toDict(() => z.boolean().optional(), ...keys));
}

export const z_unique_array = z.array(z.string()).transform((arr) => [...new Set(arr)]);

export const z_channel_settings_flags = toZObject(...channel_settings_flags);

export const z_channel_settings = z.object({
  channel_id: z.string(),
  flags: z_channel_settings_flags,
  last_indexed_snowflake: z.string().nullable(),
  invite_code: z.string().nullable(),
  solution_tag_id: z.string().nullable(),
});

export const z_channel_settings_public = z_channel_settings.pick({
  channel_id: true,
  invite_code: true,
});

export const z_channel = z.object({
  id: z.string(),
  name: z.string(),
  server_id: z.string(),
  type: z.number().refine(
    (n) => ALLOWED_CHANNEL_TYPES.has(n),
    "Channel type can only be guild forum, text, or announcement" // TODO: Make a type error if possible
  ),
  parent_id: z.string().nullable(),
});

export const z_channel_public = z_channel
  .pick({
    id: true,
    name: true,
    server_id: true,
    type: true,
    parent_id: true,
  })
  .extend({
    settings: z_channel_settings_public.pick({
      invite_code: true,
    }),
  });

export const z_discord_image = z.object({
  url: z.string(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  description: z.string().nullable(),
});

export const z_message = z.object({
  id: z.string(),
  content: z.string(),
  images: z.array(z_discord_image),
  solutions: z.array(z.string()),
  replies_to: z.string().nullable(),
  child_thread: z.string().nullable(),
  author_id: z.string(),
  channel_id: z.string(),
  server_id: z.string(),
});

export const z_message_public = z_message.pick({
  id: true,
  content: true,
  images: true,
  solutions: true,
  replies_to: true,
  child_thread: true,
  author_id: true,
  channel_id: true,
  server_id: true,
});

export const z_server_settings_flags = toZObject(...server_settings_flags);

export const z_server_settings = z.object({
  server_id: z.string(),
  flags: z_server_settings_flags,
});

export const z_server = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().nullable(),
  kicked_time: z.date().nullable(),
});

export const z_server_public = z_server.pick({
  id: true,
  name: true,
  icon: true,
});

export const z_user_server_settings_flags = toZObject(...user_server_settings_flags);

export const z_user_server_settings = z.object({
  user_id: z.string(),
  server_id: z.string(),
  flags: z_user_server_settings_flags,
});

export const z_discord_account = z.object({
  id: z.string(),
  name: z.string(),
  avatar: z.string().nullable(),
});

export const z_discord_account_public = z_discord_account.pick({
  id: true,
  name: true,
  avatar: true,
});
