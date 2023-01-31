import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";

export type SearchBarProps = {
  placeholder?: string;
  default_value?: string;
  className?: string;
};

export function SearchBar({
  placeholder = "Search for anything",
  className,
  default_value,
}: SearchBarProps) {
  return (
    <div className={className}>
      <div className="relative mt-1 flex items-center">
        <input
          type="text"
          name="search"
          id="search"
          defaultValue={default_value}
          placeholder={placeholder}
          className="block w-full rounded-md bg-neutral-200 pr-12 shadow-sm placeholder:text-neutral-700 focus:border-indigo-500 focus:ring-indigo-500 dark:bg-neutral-800 dark:text-white placeholder:dark:text-neutral-400 sm:text-sm"
        />
        <div className="absolute inset-y-0 right-0 flex py-1.5 pr-1.5">
          <button
            type="button"
            className="inline-flex items-center rounded-full border border-transparent p-3 text-neutral-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 dark:text-white"
            aria-label="Search"
          >
            <MagnifyingGlassIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
