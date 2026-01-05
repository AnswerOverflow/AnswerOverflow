import { Star } from "lucide-react";
import { GitHubIcon } from "../../icons";
import { Button } from "../button";
import { Link } from "../link";

const GITHUB_REPO_URL = "https://github.com/AnswerOverflow/AnswerOverflow";

function formatStarCount(count: number): string {
	if (count >= 1000) {
		return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k`;
	}
	return count.toString();
}

export function GitHubStarButton({ starCount }: { starCount: number | null }) {
	return (
		<Button asChild variant="outline" size="sm" className="gap-1.5">
			<Link
				href={GITHUB_REPO_URL}
				target="_blank"
				rel="noopener noreferrer"
				className="no-underline hover:no-underline"
			>
				<GitHubIcon className="size-4" />
				<span className="hidden sm:inline">Star</span>
				{starCount !== null && (
					<span className="flex items-center gap-1 text-muted-foreground">
						<Star className="size-3 fill-current" />
						{formatStarCount(starCount)}
					</span>
				)}
			</Link>
		</Button>
	);
}
