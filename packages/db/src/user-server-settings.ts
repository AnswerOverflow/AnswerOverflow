import { z_discord_account_upsert } from "./discord-account";
import { z_user_server_settings } from "./zod-schemas";

export const z_user_server_settings_required = z_user_server_settings.pick({
  user_id: true,
  server_id: true,
});

export const z_user_server_settings_mutable = z_user_server_settings
  .omit({
    user_id: true,
    server_id: true,
  })
  .partial();

export const z_user_server_settings_find = z_user_server_settings_required;

export const z_user_server_settings_create = z_user_server_settings_mutable.merge(
  z_user_server_settings_required
);
export const z_user_server_settings_create_with_deps = z_user_server_settings_create
  .omit({
    user_id: true, // we infer this from the user
  })
  .extend({
    user: z_discord_account_upsert,
  });

export const z_user_server_settings_update = z_user_server_settings_mutable.merge(
  z_user_server_settings_find
);
