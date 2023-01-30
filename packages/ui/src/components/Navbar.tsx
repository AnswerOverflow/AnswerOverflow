/* eslint-disable tailwindcss/migration-from-tailwind-2 */
import Link from "next/link";
import { AnswerOverflowLogo } from "./AnswerOverflowLogo";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { useRouter } from "next/router";
import { signIn, signOut } from "next-auth/react";
import { EllipsisVerticalIcon } from "@heroicons/react/24/solid";
import { Menu, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { trpc } from "../utils";
import { Avatar } from "./primitives/Avatar";
import { Button } from "./primitives/Button";
import type { User } from "@answeroverflow/api";
import { classNames } from "~ui/utils/styling";

const SignedInDropdownMenu = ({ signed_in_user }: { signed_in_user: User }) => (
  <Menu as="div" className="relative inline-block text-left">
    <Menu.Button>
      <div className="flex shrink-0 flex-row items-center rounded-md p-2 transition hover:bg-zinc-900/5 dark:hover:bg-white/5">
        <Avatar alt={signed_in_user.name} size={"sm"} url={signed_in_user.image} />
        <EllipsisVerticalIcon className="h-7 w-7 dark:text-white hover:dark:text-neutral-400" />
      </div>
    </Menu.Button>
    <Transition
      as={Fragment}
      enter="transition ease-out duration-100"
      enterFrom="transform opacity-0 scale-95"
      enterTo="transform opacity-100 scale-100"
      leave="transition ease-in duration-75"
      leaveFrom="transform opacity-100 scale-100"
      leaveTo="transform opacity-0 scale-95"
    >
      <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-neutral-800 dark:text-white">
        <div className="py-1">
          <Menu.Item>
            {({ active }) => (
              <Link
                href="/settings/servers"
                className={classNames(
                  active
                    ? "bg-gray-100 text-gray-900 dark:bg-neutral-700 dark:text-neutral-100"
                    : "text-gray-700 dark:text-neutral-300",
                  "block px-4 py-2 text-sm"
                )}
              >
                My Servers
              </Link>
            )}
          </Menu.Item>
          <form method="POST" action="#">
            <Menu.Item>
              {({ active }) => (
                <Button
                  className={classNames(
                    active
                      ? "bg-gray-100 text-gray-900 dark:bg-neutral-700 dark:text-neutral-100"
                      : "text-gray-700 dark:text-neutral-300",
                    "block w-full px-4 py-2 text-left text-sm"
                  )}
                  // eslint-disable-next-line @typescript-eslint/no-misused-promises
                  onClick={() => signOut()}
                >
                  Sign out
                </Button>
              )}
            </Menu.Item>
          </form>
        </div>
      </Menu.Items>
    </Transition>
  </Menu>
);

export function Navbar() {
  const router = useRouter();
  const user_query = trpc.auth.getSession.useQuery();
  const user = user_query.data?.user;

  return (
    <div className="mx-auto max-w-7xl bg-white px-2 dark:bg-neutral-800 sm:px-6 lg:px-8">
      <div className="flex h-16 items-center justify-between">
        <Link
          href="/"
          className={router.pathname === "/" && !process.env.STORYBOOK ? "invisible" : ""}
        >
          <AnswerOverflowLogo />
        </Link>
        <div className="flex items-center gap-5">
          <ThemeSwitcher />
          {user ? (
            <SignedInDropdownMenu signed_in_user={user} />
          ) : (
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            <Button visual_only onClick={() => signIn("discord")}>
              Login
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
