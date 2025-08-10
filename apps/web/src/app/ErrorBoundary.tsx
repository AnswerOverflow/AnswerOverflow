import { Component, ReactNode } from "react";
import NextLink from "next/link";

// NOTE: Once you get Clerk working you can remove this error boundary
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: ReactNode | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: unknown) {
    const errorText = "" + (error as any).toString();
    if (
      errorText.includes("@clerk/clerk-react") &&
      errorText.includes("publishableKey")
    ) {
      const [clerkDashboardUrl] = errorText.match(/https:\S+/) ?? [];
      return {
        error: (
          <>
            <p>
              Add{" "}
              <code className="relative rounded-sm bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY={'"<your publishable key>"'}
              </code>{" "}
              to the{" "}
              <code className="relative rounded-sm bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                .env
              </code>{" "}
              file
            </p>
            {clerkDashboardUrl ? (
              <p>
                You can find it at{" "}
                <NextLink
                  href={clerkDashboardUrl}
                  target="_blank"
                  className="font-medium text-primary underline underline-offset-4 hover:no-underline cursor-pointer"
                >
                  {clerkDashboardUrl}
                </NextLink>
              </p>
            ) : null}
            <p className="pl-8 text-muted-foreground">Raw error: {errorText}</p>
          </>
        ),
      };
    }

    // propagate error to Next.js provided error boundary
    throw error;
  }

  componentDidCatch() {}

  render() {
    if (this.state.error !== null) {
      return (
        <div className="bg-destructive/30 p-8 flex flex-col gap-4 container">
          <h1 className="text-xl font-bold">
            Caught an error while rendering:
          </h1>
          {this.state.error}
        </div>
      );
    }

    return this.props.children;
  }
}
