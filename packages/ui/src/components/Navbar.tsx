import Link from "next/link";
import { AnswerOverflowLogo } from "./AnswerOverflowLogo";
import { Toggle } from "./primitives/Toggle";
import { useRouter } from "next/router";

type CSSRule = {
  style: {
    color: string;
  };
};

export function Navbar() {
  const router = useRouter();

  return (
    <div className="dark: mx-auto max-w-7xl bg-white px-2 dark:bg-neutral-800 sm:px-6 lg:px-8">
      <div className="relative flex h-16 items-center justify-between">
        <Link href="/" className={router.pathname === "/" ? "invisible" : ""}>
          <AnswerOverflowLogo />
        </Link>
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
          <Toggle
            default_enabled={true}
            onChange={(dark_theme_enabled) => {
              const root = window.document.documentElement;

              // This is disgusting, but it works for switching the code highlighting
              let darkStyleSheet: CSSStyleSheet | undefined;
              let lightStyleSheet: CSSStyleSheet | undefined;
              [...document.styleSheets].forEach((styleSheet) => {
                try {
                  const rule = [...styleSheet.cssRules].find((rule) =>
                    rule.cssText.includes("hljs-keyword")
                  ) as CSSRule | undefined;

                  if (rule) {
                    if (rule.style.color === "rgb(255, 123, 114)") {
                      darkStyleSheet = styleSheet;
                    } else if (rule.style.color === "rgb(215, 58, 73)") {
                      lightStyleSheet = styleSheet;
                    }
                  }
                } catch (error) {
                  // let error pass
                }
              });

              if (dark_theme_enabled) {
                darkStyleSheet!.disabled = false;
                lightStyleSheet!.disabled = true;
                root.classList.add("dark");
              } else {
                darkStyleSheet!.disabled = true;
                lightStyleSheet!.disabled = false;
                root.classList.remove("dark");
              }

              localStorage.setItem("theme", "dark");
              return true;
            }}
          />
        </div>
      </div>
    </div>
  );
}
