import { LinkButton, type LinkButtonProps } from "./link-button";

export function GetStarted(
	props: Omit<LinkButtonProps, "href"> & {
		location: string;
	},
) {
	return (
		<LinkButton href={"/dashboard/onboarding"} variant="outline" {...props}>
			{props.children || "Add Your Server"}
		</LinkButton>
	);
}
