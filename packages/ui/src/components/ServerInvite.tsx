import type { ServerPublic, ChannelPublic } from "@answeroverflow/api";
import Link from "next/link";
import { Button } from "./primitives/Button";
import { ServerIcon } from "./ServerIcon";

export type ServerInviteProps = {
  server: ServerPublic;
  channel?: ChannelPublic;
  is_user_in_server: boolean;
};

export function ServerInvite({ server, channel, is_user_in_server }: ServerInviteProps) {
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
        {channel?.settings.invite_code && (
          <Link
            href={`https://discord.gg/${channel?.settings.invite_code}`}
            target={"_blank"}
            referrerPolicy="no-referrer"
          >
            <Button intent={"success"} visual_only>
              {is_user_in_server ? "Joined" : "Join"}
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
