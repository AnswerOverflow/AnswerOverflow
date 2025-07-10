'use client';
import React, { useState } from 'react';
import { Button } from '@answeroverflow/ui/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@answeroverflow/ui/ui/dialog';
import { MessageCircleIcon, UserPlusIcon, ExternalLinkIcon } from 'lucide-react';

export function FloatingChatWidget() {
	const [isOpen, setIsOpen] = useState(false);

	const copyDiscordUsername = () => {
		navigator.clipboard.writeText('rhyssul');
	};

	return (
		<>
			{/* Floating Button */}
			<div className="fixed bottom-6 right-6 z-50">
				<Dialog open={isOpen} onOpenChange={setIsOpen}>
					<DialogTrigger asChild>
						<Button
							size="lg"
							className="rounded-full h-14 w-14 shadow-lg hover:shadow-xl transition-all duration-300 bg-blue-600 hover:bg-blue-700"
						>
							<MessageCircleIcon className="h-6 w-6" />
							<span className="sr-only">Get Support</span>
						</Button>
					</DialogTrigger>
					<DialogContent className="sm:max-w-md">
						<DialogHeader>
							<DialogTitle className="flex items-center gap-2">
								<MessageCircleIcon className="h-5 w-5" />
								Get Support
							</DialogTitle>
							<DialogDescription>
								Need help? Connect with our support team on Discord!
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-4">
							<div className="rounded-lg border p-4 bg-slate-50 dark:bg-slate-900">
								<h3 className="font-semibold mb-2 flex items-center gap-2">
									<UserPlusIcon className="h-4 w-4" />
									How to get support:
								</h3>
								<ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
									<li>Open Discord and send a friend request to:</li>
									<li className="ml-4">
										<div className="flex items-center gap-2 mt-1">
											<code className="bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded text-xs">
												rhyssul
											</code>
											<Button
												size="sm"
												variant="outline"
												onClick={copyDiscordUsername}
												className="h-6 text-xs"
											>
												Copy
											</Button>
										</div>
									</li>
									<li>Once your friend request is accepted, send your question!</li>
									<li>Our team will get back to you as soon as possible.</li>
								</ol>
							</div>
							<div className="flex items-center gap-2 text-xs text-muted-foreground">
								<ExternalLinkIcon className="h-3 w-3" />
								<span>
									Don't have Discord?{' '}
									<a
										href="https://discord.com/download"
										target="_blank"
										rel="noopener noreferrer"
										className="text-blue-600 hover:underline"
									>
										Download it here
									</a>
								</span>
							</div>
						</div>
					</DialogContent>
				</Dialog>
			</div>
		</>
	);
}