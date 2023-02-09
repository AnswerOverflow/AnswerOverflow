import { useIsUserInServer } from "../utils";
import { ServerInvite, ServerInviteProps } from "./ServerInvite";

export function ServerInviteDriver({ server, channel }: Omit<ServerInviteProps, "isUserInServer">) {
  const isUserInServer = useIsUserInServer(server.id);
  return <ServerInvite server={server} channel={channel} isUserInServer={isUserInServer} />;
}
