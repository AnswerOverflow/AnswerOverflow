import { Providers } from './providers';
import { getServerSession } from '@answeroverflow/auth';

export default async function RootLayout({
	// Layouts must accept a children prop.
	// This will be populated with nested layouts or pages
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await getServerSession();
	return (
		<html lang="en">
			<body>
				<Providers session={undefined}>{children}</Providers>
				{session && (
					<h1>
						{session.user.name} {session.user.email}
					</h1>
				)}
			</body>
		</html>
	);
}
