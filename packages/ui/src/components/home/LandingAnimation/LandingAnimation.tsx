import { Message, MessageProps } from "~ui/components/Message";
import { gsap } from "gsap";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import "bootstrap-icons/font/bootstrap-icons.css";
import {
  useElementPosition,
  useGetDistanceBetweenRects,
  useGetRectForElement,
  useTextTypingState,
} from "~ui/utils/index";
import { GooglePage } from "./GooglePage";

export interface LandingAnimationProps {
  questionMessageData: MessageProps;
  answerMessageData: MessageProps;
}

export const LandingAnimation = ({
  questionMessageData,
  answerMessageData,
}: LandingAnimationProps) => {
  const answerRef = useRef<HTMLDivElement>(null);
  const searchBarRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const searchBarRect = useGetRectForElement(searchBarRef);
  const elementBox = useElementPosition(cursorRef);
  const distanceBetweenRects = useGetDistanceBetweenRects(searchBarRect, elementBox);
  const containerRef = useRef<HTMLDivElement>(null);
  const containerBox = useGetRectForElement(containerRef);

  const [showTextOrUrl, setShowTextOrUrl] = useState<"text" | "url">("url");
  const [shouldHighlightSearchBar, setShouldHighlightSearchBar] = useState<boolean>(false);
  const [shouldStartGoogleSearchAnimation, setShouldStartGoogleSearchAnimation] =
    useState<boolean>(false);
  const [showProgress, setShowProgress] = useState<boolean>(false);

  /**
   * Answeroverflow cursor animation
   */
  const [shouldStartAnswerOverflowAnimation, setShouldStartAnswerOverflowAnimation] =
    useState<boolean>(false);

  const [googleTitleBox, setGoogleTitleBox] = useState<DOMRect>();
  const distanceContainerToGoogleTitle = useGetDistanceBetweenRects(
    containerBox,
    googleTitleBox ?? null,
    {
      returnXY: true,
    }
  );

  const googleTitleRef = useCallback((node: HTMLDivElement) => {
    if (node !== null) {
      setGoogleTitleBox(node.getBoundingClientRect());
    }
  }, []);

  useEffect(() => {
    console.log("distanceContainerToGoogleTitle", distanceContainerToGoogleTitle);
  }, [distanceContainerToGoogleTitle]);

  const { textState, completed } = useTextTypingState(
    "How do I index my discord channels into google?",
    shouldStartGoogleSearchAnimation
  );
  const [searchBarData, setSearchBarData] = useState<{
    text: string;
    url: string;
  }>({
    text: textState ?? "",
    url: "discord.com",
  });

  const [x, setX] = useState<number>();
  const [y, setY] = useState<number>();

  useLayoutEffect(() => {
    const targetX = Math.abs(cursorRef?.current?.offsetLeft! - x!);
    const targetY = -Math.abs(cursorRef?.current?.offsetTop! - y!);
    // Gsap timeline
    const tl = gsap.timeline({
      // repeat: -1,
      // repeatDelay: 1,
      // yoyo: true,
    });

    // Slowly animate increasing the height
    tl.to(cursorRef.current, {
      x: targetX,
      y: targetY,
      duration: 1.5,
      ease: "power2.inOut",
    })
      .add(() => {
        gsap.delayedCall(0.5, () => {
          setShouldHighlightSearchBar(true);
        });
      })
      .add(() => {
        gsap.delayedCall(1, () => {
          setShouldHighlightSearchBar(false);
          setShowTextOrUrl("text");
          setShouldStartGoogleSearchAnimation(true);
        });
      });
  }, [x, y]);

  useLayoutEffect(() => {
    if (completed === true) {
      const tl = gsap.timeline();

      tl.delay(0.5)
        .add(() => {
          gsap.to(progressRef.current, {
            width: "100%",
            duration: 1,
            ease: "power2.inOut",
          });
        })
        .add(() => {
          gsap.to(progressRef.current, {
            delay: 1.25,
            opacity: "0",
            duration: 1,
            ease: "power2.inOut",
          });
        });
    }
  }, [completed]);

  // Run updateText
  useEffect(() => {
    if (!completed) {
      setSearchBarData({
        text: textState ?? "",
        url: "discord.com",
      });
    } else if (completed === true) {
      setSearchBarData({
        text: "How do I index my discord channels into google?",
        url: "google.com",
      });
      setShowTextOrUrl("url");
      setShowProgress(true);

      // Wait 2 secs
      gsap.delayedCall(2, () => {
        setShouldStartAnswerOverflowAnimation(true);
      });
    }
  }, [textState, completed]);

  useEffect(() => {
    setX(searchBarRef.current?.offsetLeft);
    setY(searchBarRef.current?.offsetTop);

    const handleResize = () => {
      setX(searchBarRef.current?.offsetLeft);
      setY(searchBarRef.current?.offsetTop);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  //  border-image-source: linear-gradient(142.68deg, #818181 0%, #393B3F 100%);

  return (
    // eslint-disable-next-line tailwindcss/no-custom-classname
    <div className="bg-gradient-to-br-dark-glass w-full rounded-xl border-1 border-[#636363] py-32 px-10 drop-shadow-2xl backdrop-blur-md">
      <div
        className="flex h-10 w-full items-center justify-center rounded-t-lg border-b-1 border-black bg-[#363636]"
        ref={containerRef}
      >
        <div className="flex w-3/4 flex-col items-center justify-center rounded-md bg-[#434343]">
          <span
            className={`flex items-center justify-center py-[0.1rem] font-normal text-white ${
              shouldHighlightSearchBar ? "bg-[#5ac8fa]" : ""
            }`}
            ref={searchBarRef}
          >
            {showTextOrUrl === "text" ? searchBarData?.text : searchBarData?.url}
          </span>
          {showProgress && (
            <div className="mr-auto h-[0.10rem] w-0 bg-[#5ac8fa]" ref={progressRef} />
          )}
        </div>
      </div>
      {completed ? (
        <GooglePage
          result={{
            url: "https://www.answeroverflow.com > ...",
            title: "How do I index my discord channels into google?",
            description:
              "How do I index my discord channels into google? How do I index my discord channels into google? How do I index my discord channels into google?",
          }}
          ref={googleTitleRef}
        />
      ) : (
        <div className="w-[36.5rem]">
          <Message {...questionMessageData} darkMode={true} showLinkIcon={false} />
          <Message {...answerMessageData} darkMode={true} showLinkIcon={false} ref={answerRef} />
        </div>
      )}
      <div className={`absolute`} ref={cursorRef}>
        {(!shouldStartGoogleSearchAnimation || shouldStartAnswerOverflowAnimation) &&
          (distanceBetweenRects && distanceBetweenRects < 16 ? (
            // eslint-disable-next-line tailwindcss/no-custom-classname
            <i className="bi bi-cursor-text text-white"></i>
          ) : (
            // eslint-disable-next-line tailwindcss/no-custom-classname
            <i className="bi bi-cursor-fill text-white"></i>
          ))}
      </div>
    </div>
  );
};
