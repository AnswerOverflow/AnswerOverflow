import { Message, MessageProps } from "~ui/components/Message";
import { gsap } from "gsap";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import "bootstrap-icons/font/bootstrap-icons.css";
import useMeasure from "react-use-measure";

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
  const [cursorRefMeasure, cursorBounds] = useMeasure();
  const [searchBarRefMeasure, searchBarBounds] = useMeasure();

  const [x, setX] = useState<number>();
  const [y, setY] = useState<number>();

  const [distance, setDistance] = useState<number>();

  useLayoutEffect(() => {
    const targetX = Math.abs(cursorRef.current?.offsetLeft - x);
    const targetY = -Math.abs(cursorRef.current?.offsetTop - y);

    const ctx = gsap.context(() => {
      // Slowly animate increasing the height
      gsap.to(cursorRef.current, {
        x: targetX,
        y: targetY,
        duration: 10,
        ease: "power2.inOut",
      });
    }, cursorRef); // <- IMPORTANT! Scopes selector text
    return () => ctx.revert(); // cleanup
  }, [x, y]);

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

  // useEffect(() => {
  //   if (transform) {
  //     const distPoints = Math.sqrt(
  //       (parseFloat(transform[0]!) - x!) ** 2 + (parseFloat(transform[1]!) - y!) ** 2
  //     );
  //     setDistance(distPoints);
  //   }
  // }, [transform, x, y, distance]);

  useEffect(() => {
    console.log(cursorBounds);
    console.log(searchBarBounds);
  }, [cursorBounds, searchBarBounds]);

  return (
    <div className="w-full rounded-lg border-2 p-2 drop-shadow-2xl">
      <div className="flex h-10 w-full items-center justify-center rounded-t-lg border-b-1 border-black bg-[#363636]">
        <div className="flex w-1/2 items-center justify-center rounded-md bg-[#434343]">
          <span
            className="flex items-center justify-center font-normal text-white"
            ref={((el: HTMLDivElement) => searchBarRefMeasure(el)) && searchBarRef}
          >
            discord.com
          </span>
        </div>
      </div>
      <Message {...questionMessageData} darkMode={true} showLinkIcon={false} />
      <Message {...answerMessageData} darkMode={true} showLinkIcon={false} ref={answerRef} />
      <div className={`absolute`} ref={((el: HTMLDivElement) => cursorRefMeasure(el)) && cursorRef}>
        {/* {distance && distance >= 230 ? ( */}
        <i className="bi bi-cursor-text text-white"></i>
        {/* ) : ( */}
        {/* <i className="bi bi-cursor-fill text-white"></i> */}
        {/* )} */}
      </div>
    </div>
  );
};
