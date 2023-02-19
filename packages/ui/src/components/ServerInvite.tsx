import type { ServerPublic, ChannelPublicWithFlags } from "@answeroverflow/api";
import Link from "next/link";
import { Button } from "./deprecated/Button";
import { ServerIcon } from "./ServerIcon";

export type ServerInviteProps = {
  server: ServerPublic;
  channel?: ChannelPublicWithFlags;
  isUserInServer: boolean;
};

export function ServerInvite({ server, channel, isUserInServer }: ServerInviteProps) {
  const ServerNameAndChannelName = () => (
    <div className="flex flex-col">
      <span className="text-base font-bold text-black dark:text-neutral-300">{server.name}</span>
      {channel && (
        <span className="text-sm text-gray-600 dark:text-neutral-400">#{channel.name}</span>
      )}
    </div>
  );

  return (
    <div className="flex max-w-md  items-center justify-between gap-3 rounded-lg bg-neutral-100 p-3 text-black dark:bg-stone-900 dark:text-neutral-300 sm:flex-row">
      <div className="flex">
        <div className="mr-4 shrink-0">
          <ServerIcon server={server} />
        </div>

        <ServerNameAndChannelName />
      </div>
      <div>
        {channel?.inviteCode && (
          <Link
            href={`https://discord.gg/${channel?.inviteCode}`}
            target={"Blank"}
            referrerPolicy="no-referrer"
          >
            <Button intent={"success"} visualOnly>
              {isUserInServer ? "Joined" : "Join"}
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
