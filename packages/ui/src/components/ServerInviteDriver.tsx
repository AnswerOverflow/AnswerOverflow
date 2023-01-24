import { trpc } from "../utils";
import { ServerInvite, ServerInviteProps } from "./ServerInvite";

export function ServerInviteDriver({
  server,
  channel,
}: Omit<ServerInviteProps, "is_user_in_server">) {
  const { data: servers } = trpc.auth.getServers.useQuery();
  const is_user_in_server = servers?.some((s) => s.id === server.id) ?? false;
  return <ServerInvite server={server} channel={channel} is_user_in_server={is_user_in_server} />;
}
