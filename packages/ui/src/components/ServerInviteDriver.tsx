import { useIsUserInServer } from "../utils";
import { ServerInvite, ServerInviteProps } from "./ServerInvite";

export function ServerInviteDriver({
  server,
  channel,
}: Omit<ServerInviteProps, "is_user_in_server">) {
  const is_user_in_server = useIsUserInServer(server.id);
  return <ServerInvite server={server} channel={channel} is_user_in_server={is_user_in_server} />;
}
