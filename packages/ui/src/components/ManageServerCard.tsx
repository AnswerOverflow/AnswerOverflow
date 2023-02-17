import type { ServerPublic } from "@answeroverflow/api";
import Link from "next/link";
import { Button } from "./primitives/Button";
import { ServerIcon } from "./ServerIcon";
import Image from "next/image";

export type ManageServerCardProps = {
  server: ServerPublic;
  role: string;
};

export function ManageServerCard({ server, role }: ManageServerCardProps) {
  const ServerNameAndRole = () => (
    <div className="flex flex-col gap-1">
      <span className="text-base font-bold text-black dark:text-neutral-300">{server.name}</span>
      <span className="text-sm text-gray-600 dark:text-neutral-400">{role}</span>
    </div>
  );

  const ServerIconWithBlurredBackground = () => {
    return (
      <div className="relative mx-auto aspect-video rounded-lg">
        {server.icon && (
          <Image
            src={`https://cdn.discordapp.com/icons/${server.id}/${server.icon}.png`}
            alt={server.name}
            fill
            className="h-full w-full overflow-hidden rounded-lg object-cover opacity-25"
          />
        )}
        <div className="relative z-10 h-full w-full rounded-lg bg-black/5 shadow-md backdrop-blur-md " />
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <ServerIcon server={server} size={"lg"} />
        </div>
      </div>
    );
  };

  return (
    <div className="grid max-w-xs grid-cols-2 grid-rows-3 gap-3 rounded-lg">
      <div className="col-span-2 col-start-1 row-span-2 row-start-1">
        <ServerIconWithBlurredBackground />
      </div>
      <div className="col-span-2 col-start-1 row-span-1 row-start-3">
        <ServerNameAndRole />
      </div>
      <div className="col-span-1 col-start-2 row-span-1 row-start-3 flex">
        <div className="ml-auto">
          <Link href={`https://discord.gg/`} target={"Blank"} referrerPolicy="no-referrer">
            <Button intent={"primary"} visualOnly>
              Manage
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
