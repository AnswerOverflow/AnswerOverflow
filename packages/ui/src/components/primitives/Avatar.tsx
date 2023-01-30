import Image from "next/image";

export type AvatarSize = "sm" | "md" | "lg";

export type AvatarProps = {
  size: AvatarSize;
  url?: string | null;
  alt?: string | null;
};

export function getAvatarSize(size: AvatarSize) {
  switch (size) {
    case "sm":
      return 40;
    case "md":
      return 48;
    case "lg":
      return 64;
  }
}

export function Avatar({ url, alt = "Profile Avatar", size }: AvatarProps) {
  if (!alt) alt = "Profile Avatar";
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-neutral-50 dark:bg-neutral-700`}
    >
      {url ? (
        <Image
          src={url}
          alt={alt}
          width={getAvatarSize(size)}
          height={getAvatarSize(size)}
          className="inline-block rounded-full"
        />
      ) : (
        <span
          className="inline-flex items-center justify-center rounded-full text-xl text-black dark:text-white"
          style={{
            width: getAvatarSize(size),
            height: getAvatarSize(size),
          }}
        >
          {alt
            .split(" ")
            .filter((word) => word.length > 0)
            .map((word) => word[0]?.toUpperCase())
            .join("")}
        </span>
      )}
    </span>
  );
}
