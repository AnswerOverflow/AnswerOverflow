"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { trackEvent } from "../../analytics/client";
import { usePostHog } from "../../analytics/client/use-posthog";
import { Button } from "../button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "../dialog";
import { Textarea } from "../textarea";

export function FeedbackButton() {
	const [open, setOpen] = useState(false);
	const [feedback, setFeedback] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitted, setSubmitted] = useState(false);
	const posthog = usePostHog();
	const pathname = usePathname();

	const handleSubmit = () => {
		if (!feedback.trim()) return;

		setIsSubmitting(true);

		trackEvent(
			"Feedback Submitted",
			{
				feedback: feedback.trim(),
				page: pathname ?? "/",
			},
			posthog,
		);

		setIsSubmitting(false);
		setSubmitted(true);

		setTimeout(() => {
			setOpen(false);
			setFeedback("");
			setSubmitted(false);
		}, 1500);
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="ghost">Feedback</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Send Feedback</DialogTitle>
					<DialogDescription>
						Help us improve AnswerOverflow. Share your thoughts, report bugs, or
						suggest features.
					</DialogDescription>
				</DialogHeader>
				{submitted ? (
					<div className="py-8 text-center">
						<p className="text-lg font-medium text-green-600 dark:text-green-400">
							Thank you for your feedback!
						</p>
					</div>
				) : (
					<>
						<Textarea
							placeholder="What's on your mind?"
							value={feedback}
							onChange={(e) => setFeedback(e.target.value)}
							className="min-h-[120px]"
						/>
						<DialogFooter>
							<Button variant="outline" onClick={() => setOpen(false)}>
								Cancel
							</Button>
							<Button
								onClick={handleSubmit}
								disabled={!feedback.trim() || isSubmitting}
							>
								{isSubmitting ? "Submitting..." : "Submit Feedback"}
							</Button>
						</DialogFooter>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}
