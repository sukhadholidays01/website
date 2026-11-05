This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

Sukhad Holidays is a Next.js travel website. The public cab request and tracking flow uses a server-only MySQL 8 connection and additive database migrations. Read [cab setup and workflow](docs/cab-booking.md) and [cab architecture](docs/cab-architecture.md) before configuring a public deployment.

## Run locally

Requirements: Node.js 20.9+ and npm 10+. Set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` and `DB_NAME` in the ignored root `.env.development` file. Never use `NEXT_PUBLIC_*` for database credentials.

If the app or Codex tooling does not start, switch to a compatible Node version before running the project.

Apply the additive MySQL schema, then run the development server:

```bash
npm run db:migrate
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

The website uses the `src/app` App Router.

## Cab booking and launch status

Public cab requests and booking status are stored in MySQL. A request is not a confirmed ride: configure approved routes, fare policies, fleet and business policies before accepting real customer bookings. Payment settlement and live email delivery are not enabled by default.

The general `/admin` workspace is a browser-local demo and is not connected to MySQL. The cab operations API uses the persistent cab repository; broader admin work is deferred.

Run `npm run typecheck`, `npm run lint`, `npm run build` and `npm run test:cabs` for verification. The cab regression suite uses explicit in-memory test mode and does not write test records to the configured database.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
