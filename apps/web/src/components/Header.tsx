"use client";

import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import Logo from "./common/Logo";
import Link from "next/link";
import { useUser } from "@clerk/clerk-react";
import { UserNav } from "./common/UserNav";
import { usePathname } from "next/navigation";

type NavigationItem = {
  name: string;
  href: string;
  current: boolean;
};

const navigation: NavigationItem[] = [
  { name: "Benefits", href: "#Benefits", current: true },
  { name: "Reviews", href: "#reviews", current: false },
];

export default function Header() {
  const { user } = useUser();
  const pathname = usePathname();

  return (
    <Disclosure as="nav" className=" ">
      {({ open }) => (
        <>
          <div className="flex items-center bg-white h-16 sm:h-20">
            <div className="container px-2 sm:px-0">
              <div className="relative flex h-16 items-center justify-between">
                <div className="flex sm:hidden shrink-0 items-center">
                  <Logo isMobile={true} />
                </div>
                <div className="sm:flex hidden shrink-0 items-center">
                  <Logo />
                </div>
                {pathname === "/" && (
                  <div className="flex flex-1 items-center justify-center ">
                    <div className="hidden sm:ml-6 sm:block">
                      <ul className="flex space-x-28">
                        {navigation.map((item) => (
                          <li key={item.name}>
                            <Link
                              href={item.href}
                              className="text-[#2D2D2D] text-center text-xl not-italic font-normal leading-[normal]"
                              aria-current={item.current ? "page" : undefined}
                            >
                              {item.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                {user ? (
                  <div className="hidden sm:flex absolute inset-y-0 right-0 gap-6 items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
                    <Link href="/notes">
                      <button
                        type="button"
                        className=" text-white text-center text-xl not-italic font-normal leading-[normal] font-montserrat px-[22px] py-[11px] button"
                      >
                        See your Notes
                      </button>
                    </Link>
                    <UserNav
                      image={user?.imageUrl}
                      name={user?.fullName!}
                      email={user?.primaryEmailAddress?.emailAddress!}
                    />
                  </div>
                ) : (
                  <div className="hidden sm:flex absolute inset-y-0 right-0 gap-6 items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
                    <Link
                      href="/notes"
                      className="border rounded-lg border-solid border-[#2D2D2D] text-[#2D2D2D] text-center text-xl not-italic font-normal leading-[normal] font-montserrat px-[22px] py-2.5"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/notes"
                      className=" text-white text-center text-xl not-italic font-normal leading-[normal] font-montserrat px-[22px] py-[11px] button"
                    >
                      Get Started
                    </Link>
                  </div>
                )}
                <div className="block sm:hidden">
                  {/* Mobile menu button*/}
                  <DisclosureButton className="relative inline-flex  items-center justify-center rounded-md p-2 text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-inset focus:ring-white">
                    <span className="absolute -inset-0.5" />
                    <span className="sr-only">Open main menu</span>
                    {open ? (
                      <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                    ) : (
                      <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                    )}
                  </DisclosureButton>
                </div>
              </div>
            </div>
          </div>

          <DisclosurePanel className="sm:hidden">
            <div className="space-y-1 px-2 pb-3 pt-2 flex flex-col gap-3 items-start">
              {navigation.map((item) => (
                <DisclosureButton
                  key={item.name}
                  as={Link}
                  href={item.href}
                  className="text-[#2D2D2D] text-center text-xl not-italic font-normal leading-[normal]"
                  aria-current={item.current ? "page" : undefined}
                >
                  {item.name}
                </DisclosureButton>
              ))}
              <div className="flex gap-6 items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
                <Link
                  href="/notes"
                  className="border rounded-lg border-solid border-[#2D2D2D] text-[#2D2D2D] text-center text-xl not-italic font-normal leading-[normal] font-montserrat px-5 py-[5px]"
                >
                  Sign in
                </Link>
                <Link
                  href="/notes"
                  className=" text-white text-center text-xl not-italic font-normal leading-[normal] font-montserrat px-5 py-1.5 button"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </DisclosurePanel>
        </>
      )}
    </Disclosure>
  );
}
