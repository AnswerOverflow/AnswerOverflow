import type { ServerPublic } from "@answeroverflow/api";
import Image from "next/image";

export type ServerIconProps = {
  server: ServerPublic;
};

const makeServerIconLink = (server: ServerPublic, size: number = 64) => {
  if (!server.icon) return undefined;
  return `https://cdn.discordapp.com/icons/${server.id}/${server.icon}.png?size=${size}`;
};

export function ServerIcon({ server }: ServerIconProps) {
  const server_icon_url = makeServerIconLink(server, 48);
  return (
    <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-500">
      {server_icon_url ? (
        <Image
          src={server_icon_url}
          alt={server.name}
          width={48}
          height={48}
          className="inline-block rounded-full"
        />
      ) : (
        <span className="text-2xl font-bold text-white">{server.name[0]}</span>
      )}
    </span>
  );
}
