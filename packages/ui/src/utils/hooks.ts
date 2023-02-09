import { trpc } from "./trpc";

export const useIsUserInServer = (serverId: string) => {
  const { data: servers } = trpc.auth.getServers.useQuery();
  return servers?.some((s) => s.id === serverId) ?? false;
};
