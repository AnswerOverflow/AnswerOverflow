'use client';

import { ThumbsDown, ThumbsUp } from 'lucide-react';
import * as React from 'react';
import { MessagePageViewProps, trackEvent } from '../hooks/events';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { usePostHog } from '../hooks/use-posthog';

export function HelpfulFeedback(props: {
	page: MessagePageViewProps;
}) {
	const [voted, setVoted] = React.useState<'Yes' | 'No' | null>(null);
	const posthog = usePostHog();
	const handleVote = (value: 'Yes' | 'No') => {
		if (!voted) {
			setVoted(value);
			trackEvent(
				'Helpful Feedback Click',
				{
					feedback: value,
					...props.page,
				},
				posthog,
			);
		}
	};

	return (
		<Card className="">
			<CardHeader className="pb-3">
				<CardTitle className="  text-foreground">
					Did you find this page helpful?
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-2 items-center">
				<div className="flex  gap-2">
					<Button
						variant="ghost"
						size="sm"
						className={`group disabled:opacity-100 ${voted === 'Yes' ? 'text-green-500' : 'text-foreground'}`}
						onClick={() => handleVote('Yes')}
						disabled={voted !== null}
					>
						<ThumbsUp className="mr-1 h-4 w-4 transition-colors group-hover:text-green-500" />
						Yes
					</Button>
					<Button
						variant="ghost"
						size="sm"
						className={`group disabled:opacity-100 ${voted === 'No' ? 'text-red-500' : 'text-foreground'}`}
						onClick={() => handleVote('No')}
						disabled={voted !== null}
					>
						<ThumbsDown className="mr-1 h-4 w-4 transition-colors group-hover:text-red-500" />
						No
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
