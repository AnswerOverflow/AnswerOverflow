"use client";

import { getBaseUrl } from "../../utils/links";
import { AnswerOverflowLogo } from "../answer-overflow-logo";
import { Link } from "../link";
import { ThemeSwitcher } from "../theme-switcher";

export function TenantFooter() {
	const baseUrl = getBaseUrl();
	return (
		<footer>
			<div className="flex flex-col items-center justify-center gap-4 py-8">
				<Link
					href={baseUrl}
					className="flex flex-col items-center justify-center gap-2 fill-black stroke-black font-bold hover:fill-blue-500 hover:stroke-blue-500 hover:text-blue-500 dark:fill-white dark:stroke-white hover:dark:fill-blue-500 hover:dark:stroke-blue-500"
				>
					<span>Powered by</span>
					<div className={"w-36"}>
						<AnswerOverflowLogo
							className="mx-auto fill-inherit stroke-inherit dark:fill-inherit dark:stroke-inherit"
							width={"full"}
						/>
					</div>
				</Link>
				<ThemeSwitcher />
			</div>
		</footer>
	);
}
