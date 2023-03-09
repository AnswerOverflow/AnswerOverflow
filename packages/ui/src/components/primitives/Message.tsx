import { DiscordAvatar } from "../DiscordAvatar";
import { getSnowflakeUTCDate } from "~ui/utils/snowflake";
import Image from "next/image";
import discordMarkdown from "discord-markdown";
import Parser from "html-react-parser";
import type { APIMessageWithDiscordAccount, ChannelPublicWithFlags } from "@answeroverflow/api";
import { useIsUserInServer } from "~ui/utils/hooks";

export const MessageAuthorArea = ({ message }: { message: APIMessageWithDiscordAccount }) => {
  return (
    <div className="flex w-full min-w-0 gap-2">
      {/* TODO: sort out responsive styling */}
      <div className="flex w-full flex-col items-center font-body text-lg text-[#FFFFFF]/[.47] sm:flex-row">
        <span className="mr-1">{message.author.name}</span>
        <span className="ml-auto">{getSnowflakeUTCDate(message.id)}</span>
      </div>
    </div>
  );
};

const { toHTML } = discordMarkdown;

export const MessageContents = ({ message }: { message: APIMessageWithDiscordAccount }) => {
  const convertedMessageContent = toHTML(message.content);
  const parsedMessageContent = Parser(convertedMessageContent);
  return <div className={"pt-2 text-ao-white"}>{parsedMessageContent}</div>;
};

export const MessageTitle = ({
  thread,
  channel,
}: {
  thread?: ChannelPublicWithFlags;
  channel: ChannelPublicWithFlags;
}) => {
  return (
    <div className="pt-4">
      <h4 className="font-body text-4xl font-semibold text-ao-white">
        {thread?.name ?? channel.name}
      </h4>
    </div>
  );
};

export const MessageImages = ({ message }: { message: APIMessageWithDiscordAccount }) => {
  function MessageImage({ image }: { image: APIMessageWithDiscordAccount["images"][number] }) {
    let width = image.width;
    let height = image.height;
    const maxWidth = 400;
    const maxHeight = 300;

    if (!width || !height)
      return (
        // TODO: Bit of a hack for now since next images don't work well with no w/h specified
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="max-w-full md:max-w-sm"
          src={image.url}
          style={{
            width: "fit-content",
            height: "auto",
            objectFit: "cover",
          }}
          alt={image.description ? image.description : "Image"}
        />
      );
    const originalWidth = width;
    const originalHeight = height;
    if (width > height) {
      width = maxWidth;
      height = (maxWidth / originalWidth) * originalHeight;
    } else {
      height = maxHeight;
      width = (maxHeight / originalHeight) * originalWidth;
    }

    const aspectRatio = width / height;
    return (
      <Image
        key={image.url}
        src={image.url}
        width={originalWidth}
        height={originalHeight}
        alt={image.description ? image.description : "Image"}
        style={{
          maxWidth: `${width}px`,
          maxHeight: `${maxHeight}px`,
          aspectRatio: `${aspectRatio}`,
        }}
      />
    );
  }
  return (
    <div className="grid gap-2">
      {message.images.map((image) => (
        <MessageImage key={image.url} image={image} />
      ))}
    </div>
  );
};

export const MessageRenderer = ({ message }: { message: APIMessageWithDiscordAccount }) => {
  return (
    <div className="grow rounded-bl-standard bg-[#00FF85]/[0.01]">
      <div className="select-none p-6">
        <div className="flex items-center gap-2">
          <DiscordAvatar user={message.author} />
          <MessageAuthorArea message={message} />
        </div>
        <MessageContents message={message} />
        <MessageImages message={message} />
      </div>
    </div>
  );
};

export const Message = ({ message }: { message: APIMessageWithDiscordAccount }) => {
  return (
    <MessageBlurrer message={message}>
      <MessageRenderer message={message} />
    </MessageBlurrer>
  );
};

export const MessageBlurrer = ({
  children,
  message,
}: {
  children: React.ReactNode;
  message: APIMessageWithDiscordAccount;
}) => {
  const isUserInServer = useIsUserInServer(message.serverId);

  // We must hide backdrop blur to prevent the border around the message from being blurred as well - causes weird color change
  return (
    <ContentBlurrer blurred={!isUserInServer} hideBackdropBlur>
      {children}
    </ContentBlurrer>
  );
};

export const ContentBlurrer = ({
  blurred,
  children,
  hideBackdropBlur,
  notPublicTitle = "Message Not Public",
  notPublicInstructions = "Sign In & Join Server To View",
}: {
  blurred: boolean;
  notPublicTitle?: string;
  children: React.ReactNode;
  notPublicInstructions?: string;
  hideBackdropBlur?: boolean;
}) => {
  const blurAmount = ".4rem";

  if (!blurred) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div
        style={{
          filter: `blur(${blurAmount})`,
          backdropFilter: `${hideBackdropBlur ? "" : `blur(${blurAmount})`}`,
          WebkitBackdropFilter: `${hideBackdropBlur ? "" : `blur(${blurAmount})`}`,
          WebkitFilter: `blur(${blurAmount})`,
          msFilter: `blur(${blurAmount})`,
        }}
        tabIndex={-1}
      >
        {children}
      </div>
      <div>
        <div className="absolute inset-0 " />
        <div className="absolute inset-0 flex items-center justify-center ">
          <div
            className={`flex flex-col items-center justify-center rounded-standard bg-ao-black/75 p-5 text-center text-ao-white backdrop-blur-sm`}
          >
            <div className="text-2xl">{notPublicTitle}</div>
            <div>{notPublicInstructions}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// // TODO: Align text to be same level with the avatar
// export const OldMessage = forwardRef<HTMLDivElement, MessageProps>(function MessageComp(
//   {
//     message,
//     thread,
//     blurred = false,
//     notPublicTitle = "Message Not Public",
//     forceDarkMode = false,
//     showLinkIcon = true,
//     customMessageDateString,
//     additionalMessageBoxClassNames,
//   },
//   ref
// ) {
//   const isUserInServer = useIsUserInServer(message.serverId);
//   if (isUserInServer) {
//     blurred = false;
//   }

//   function getMessageUrl({
//     serverId,
//     channelId,
//     messageId,
//     threadId,
//   }: {
//     serverId: string;
//     channelId: string;
//     messageId: string;
//     threadId?: string;
//   }) {
//     const endpoint = `${serverId}/${channelId}/${threadId ? threadId + "/" : ""}${messageId}`;
//     return `discord://discord.com/channels/${endpoint}`;
//   }

//   const Contents = () => (
//     <div className="flex w-full flex-col items-start justify-center">
//       <div className="group relative flex w-full break-words rounded-xl p-1 ">
//         <div className="mr-4 hidden shrink-0 sm:block">
//           <DiscordAvatar user={message.author} />
//         </div>
//         <div className="w-full">
//           <div className="flex w-full min-w-0  justify-between">
//             {/* TODO: Improve styling */}
//             {showLinkIcon && (
//               <Link
//                 href={getMessageUrl({
//                   serverId: message.serverId,
//                   channelId: thread && thread.parentId ? thread.parentId : message.channelId,
//                   messageId: message.id,
//                   threadId: thread?.id,
//                 })}
//                 className="absolute right-0 h-6 w-6 group-hover:visible"
//                 aria-label="Open in Discord"
//               >
//                 <DiscordIcon color="blurple" />
//               </Link>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );

//   const blurAmount = ".4rem";

//   return (
//     <div
//       className={`relative h-full w-full  p-2 ${additionalMessageBoxClassNames ?? ""} ${forceDarkMode ? "bg-[#36393F]" : "dark:bg-[#36393F]"
//         }`}
//       ref={ref}
//     >
//       {blurred ? (
//         <>
//           <div
//             style={{
//               filter: `blur(${blurAmount})`,
//               backdropFilter: `blur(${blurAmount})`,
//               WebkitBackdropFilter: `blur(${blurAmount})`,
//               WebkitFilter: `blur(${blurAmount})`,
//               msFilter: `blur(${blurAmount})`,
//             }}
//           >
//             <Contents />
//           </div>
//           <div>
//             <div className="absolute inset-0 " />
//             <div className="absolute inset-0 flex items-center justify-center ">
//               <div
//                 className={`flex flex-col items-center justify-center text-center text-black ${forceDarkMode ? "text-white" : "dark:text-white"
//                   }`}
//               >
//                 <div className="text-2xl ">{notPublicTitle}</div>
//                 <div>Sign In & Join Server To View</div>
//               </div>
//             </div>
//           </div>
//         </>
//       ) : (
//         <Contents />
//       )}
//     </div>
//   );
// });
