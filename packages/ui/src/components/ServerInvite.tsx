import type { ServerPublic, ChannelPublic } from "@answeroverflow/api";
import { Button } from "./primitives/Button";

export type ServerInviteProps = {
  server: ServerPublic;
  channel: ChannelPublic;
  is_user_in_server: boolean;
};

export function ServerInvite({ server, channel, is_user_in_server }: ServerInviteProps) {
  const ServerIcon = () => (
    <svg
      className="h-16 w-16 border border-gray-300 bg-white text-gray-300"
      preserveAspectRatio="none"
      stroke="currentColor"
      fill="none"
      viewBox="0 0 200 200"
      aria-hidden="true"
    >
      <path vectorEffect="non-scaling-stroke" strokeWidth={1} d="M0 0l200 200M0 200L200 0" />
    </svg>
  );
  return (
    <div className="flex max-w-md flex-col items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 text-black dark:bg-neutral-900 dark:text-neutral-300 sm:flex-row">
      <div className="flex">
        <div className="mr-4 shrink-0">
          <ServerIcon />
        </div>
        <div>
          <div className="flex flex-col">
            <span className="text-xl font-bold text-black dark:text-neutral-300">
              {server.name}
            </span>
            <span className="text-lg text-gray-500 dark:text-neutral-400">#{channel.name}</span>
          </div>
        </div>
      </div>

      <Button className="w-full sm:w-32">{is_user_in_server ? "Joined" : "Join"}</Button>
    </div>
  );
}
