import Link from "next/link";
import { AnswerOverflowLogo } from "./AnswerOverflowLogo";
import { Toggle } from "./primitives/Toggle";
import { useRouter } from "next/router";

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
            onChange={(dark_theme_enabled) => {
              const root = window.document.documentElement;
              if (dark_theme_enabled) {
                root.classList.add("dark");
              } else {
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
