import { RefObject, useEffect, useState } from "react";
import { trpc } from "./trpc";

export const useIsUserInServer = (serverId: string) => {
  const { data: servers } = trpc.auth.getServers.useQuery();
  return servers?.some((s) => s.id === serverId) ?? false;
};

export const useElementPosition = (element: RefObject<HTMLDivElement>) => {
  const [elementBox, setElementBox] = useState<DOMRect | null>(null);
  useEffect(() => {
    const config: MutationObserverInit = {
      childList: false,
      attributes: true,
      subtree: false,
    };

    const callback: MutationCallback = (mutationList) => {
      for (const mutation of mutationList) {
        if (mutation.type === "attributes") {
          // Check if is a div
          if (mutation.target.nodeName === "DIV") {
            // Change type to div
            const div = mutation.target as HTMLDivElement;
            setElementBox(div.getBoundingClientRect());
          }
        }
      }
    };
    const observer = new MutationObserver(callback);

    console.log(typeof element);
    observer.observe(element?.current!, config);

    return () => {
      if (element) {
        observer.disconnect();
      }
    };
  }, [element]);

  useEffect(() => {
    const recalculateRect = () => {
      setElementBox(element?.current?.getBoundingClientRect() ?? null);
    };

    window.addEventListener("resize", recalculateRect);
    window.addEventListener("scroll", recalculateRect);

    return () => {
      window.removeEventListener("resize", recalculateRect);
      window.removeEventListener("scroll", recalculateRect);
    };
  }, [element]);

  return elementBox;
};

export interface DistanceOptions {
  returnXY?: boolean;
}

export const useGetDistanceBetweenRects = (
  rect1: DOMRect | null,
  rect2: DOMRect | null,
  options?: DistanceOptions
) => {
  const [distance, setDistance] = useState<
    | number
    | null
    | {
        x: number;
        y: number;
      }
  >(null);

  useEffect(() => {
    if (rect1 === null || rect2 === null) return;
    // if (options && options.returnXY) {
    // return setDistance({
    //   x: rect1.x - rect2.x,
    //   y: rect1.y - rect2.y,
    // });
    // } else {
    const distanceBetweenRects = Math.sqrt(
      Math.pow(rect1.x - rect2.x, 2) + Math.pow(rect1.y - rect2.y, 2)
    );
    setDistance(distanceBetweenRects);
    // }
  }, [options, rect1, rect2]);

  return distance;
};

export const useGetRectForElement = (element: RefObject<HTMLDivElement>) => {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    setRect(element?.current?.getBoundingClientRect() ?? null);
  }, [element]);

  // Handle resize
  useEffect(() => {
    const recalculateRect = () => {
      setRect(element?.current?.getBoundingClientRect() ?? null);
    };

    window.addEventListener("resize", recalculateRect);
    window.addEventListener("scroll", recalculateRect);

    return () => {
      window.removeEventListener("resize", recalculateRect);
      window.removeEventListener("scroll", recalculateRect);
    };
  }, [element]);

  return rect;
};

export const useTheme = () => {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const themeStorage = localStorage.getItem("isDarkMode") as "true" | "false" | null;

  // Listen to changes to the theme in storage
  useEffect(() => {
    if (themeStorage === "true") {
      setTheme("dark");
    } else if (themeStorage === "false") {
      setTheme("light");
    }
  }, [themeStorage, theme]);

  return theme;
};
