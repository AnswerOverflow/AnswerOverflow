import {
	AOHead,
	Heading,
	ManageServerCard,
	SignInButton,
} from '~ui/components/primitives';
import { useSession } from 'next-auth/react';
import { trpc } from '~ui/utils/trpc';

export const OnboardingLanding = () => {
	const session = useSession();
	const { data: servers } = trpc.auth.getServersForOnboarding.useQuery(
		undefined,
		{
			enabled: session.status === 'authenticated',
		},
	);

	const CTA = () => {
		switch (session.status) {
			case 'authenticated':
				return (
					<div>
						<Heading.H1 className="py-8 text-4xl">
							Select a server to get started
						</Heading.H1>
						<div className="grid max-h-vh60 max-w-4xl grid-cols-3 gap-16 overflow-y-scroll p-8 ">
							{servers?.map((server) => (
								<div key={server.id}>
									<ManageServerCard
										server={{
											...server,
											description: null,
											vanityUrl: null,
											kickedTime: null,
										}}
									/>
								</div>
							))}
						</div>
					</div>
				);
			case 'loading':
				return <div />;
			case 'unauthenticated':
				return (
					<div>
						<Heading.H1 className="text-4xl">
							Welcome to Answer Overflow!
						</Heading.H1>
						<Heading.H2 className="text-2xl">
							{"Let's"} get you signed in
						</Heading.H2>
						<SignInButton />
					</div>
				);
		}
	};

	return (
		<>
			<AOHead
				title="Onboarding"
				description="Browse communities on Answer Overflow."
				path="/communities"
			/>
			<div className="flex h-screen flex-col items-center justify-center text-center">
				<CTA />
			</div>
		</>
	);
};
