/* eslint-disable tailwindcss/no-custom-classname */
export interface MessageResultProps {
  authorAvatar: string;
  /**
   * @example "user#1234"
   */
  authorName: string;
  questionPostedTimestamp: string;
  title: string;
  description: string;
  views: number;
  comments: number;

  server: {
    serverIcon: string;
    serverName: string;
    channelName: string;
  };

  response:
    | {
        responseAuthorAvatar: string;
        /**
         * @example "user#1234"
         */
        responseAuthorName: string;
        responseContent: string;
        readMoreLink: string;
      }
    | false;
}

export const MessageResult = ({
  authorAvatar,
  authorName,
  questionPostedTimestamp,
  title,
  description,
  ViewColumnsIcon,
  comments,
}: MessageResultProps) => {
  return (
    <div className="rounded-standard bg-[#181B1F] px-2">
      {/* Body */}
      <div>
        <div>
          {/* Timestamp area */}
          <div className="flex flex-row">
            <div className="flex flex-row items-center justify-center gap-5">
              {/* Image */}
              <div className="h-8 w-8 rounded-[50%] bg-[#D9D9D9]/[.6]"></div>
              <span className="font-body text-white/[.47]">{authorName}</span>
            </div>
          </div>

          <div>
            <h4 className="font-body text-4xl font-semibold text-ao-white">{title}</h4>
            <p className="font-body text-ao-white">{description}</p>
          </div>
        </div>

        {/* Answer */}
        <div></div>
      </div>

      {/* Server invite */}
      <div>
        <div className="w-32 h-32 rounded-[45%]" />
      </div>
    </div>
  );
};
