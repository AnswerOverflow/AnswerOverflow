import Image from "next/image";
import type { DiscordAccountPublic } from "~api/router/index";

export type AvatarProps = {
  user: DiscordAccountPublic;
};

const makeUserIconLink = (user: Pick<DiscordAccountPublic, "id" | "avatar">, size: number = 64) => {
  if (user.avatar)
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=${size}`;
  return `https://cdn.discordapp.com/embed/avatars/${parseInt(user.id) % 5}.png?size=${size}`;
};

export function Avatar({ user }: AvatarProps) {
  const profilePictureUrl = makeUserIconLink(user, 48);
  return (
    <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-500">
      <Image
        src={profilePictureUrl}
        alt={user.name}
        width={48}
        height={48}
        className="inline-block rounded-full"
      />
    </span>
  );
}
