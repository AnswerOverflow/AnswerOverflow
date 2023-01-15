// @ts-check
/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
 * This is especially useful for Docker builds.
 */
// @ts-ignore
!process.env.SKIP_ENV_VALIDATION && (await import("./src/env/server.mjs"));

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: [
    "@answeroverflow/api",
    "@answeroverflow/auth",
    "@answeroverflow/db",
    "@answeroverflow/tailwind-config",
    "@answeroverflow/ui",
  ],
  webpack: (config) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    config.externals = [
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      ...(config.externals || []),
      "@prisma/client",
    ];
    // Important: return the modified config
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return config;
  },
  images: {
    domains: ["cdn.discordapp.com"],
  },
  // We already do linting on GH actions
  eslint: {
    ignoreDuringBuilds: !!process.env.CI,
  },
};

export default config;
