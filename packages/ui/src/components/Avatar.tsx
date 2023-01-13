import Image from "next/image";

export type AvatarProps = {
  user: {
    name: string;
    id: string;
    avatar?: string;
  };
};

const makeUserIconLink = (
  user: {
    id: string;
    avatar?: string;
  },
  size: number = 64
) => {
  if (user.avatar == undefined)
    return `https://cdn.discordapp.com/embed/avatars/${parseInt(user.id) % 5}.png?size=${size}`;
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=${size}`;
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
      {/* <span className="text-xs font-medium leading-none text-white">{user.name}</span> */}
    </span>
  );
}
