import { trpc } from "./trpc";

export const useIsUserInServer = (server_id: string) => {
  const { data: servers } = trpc.auth.getServers.useQuery();
  return servers?.some((s) => s.id === server_id) ?? false;
};
