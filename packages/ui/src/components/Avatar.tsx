export type AvatarProps = {
  user: {
    name: string;
  };
};

function Avatar({ user }: AvatarProps) {
  return (
    <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-gray-500">
      <span className="text-center text-xl font-medium leading-none text-white">{user.name}</span>
    </span>
  );
}

export default Avatar;
