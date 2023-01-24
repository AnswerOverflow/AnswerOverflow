import type { ServerPublic, ChannelPublic } from "@answeroverflow/api";
import { Button } from "./primitives/Button";
import { ServerIcon } from "./ServerIcon";

export type ServerInviteProps = {
  server: ServerPublic;
  channel?: ChannelPublic;
  is_user_in_server: boolean;
};

export function ServerInvite({ server, channel, is_user_in_server }: ServerInviteProps) {
  return (
    <div className="flex max-w-md  items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 text-black dark:bg-neutral-900 dark:text-neutral-300 sm:flex-row">
      <div className="flex">
        <div className="mr-4 shrink-0">
          <ServerIcon server={server} />
        </div>
        <div>
          <div className="flex flex-col">
            <span className="text-xl font-bold text-black dark:text-neutral-300">
              {server.name}
            </span>
            {channel && (
              <span className="text-lg text-gray-500 dark:text-neutral-400">#{channel.name}</span>
            )}
          </div>
        </div>
      </div>

      <Button className="w-full sm:w-32">{is_user_in_server ? "Joined" : "Join"}</Button>
    </div>
  );
}
