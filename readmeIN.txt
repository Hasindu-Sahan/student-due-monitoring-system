Project Setup Instructions
==========================

This file is written for a new user or an automated VS Code agent to set up the project after cloning.

Prerequisites
-------------
- Node.js installed (recommended 20+)
- npm installed
- PostgreSQL accessible from the machine
- A valid PostgreSQL connection URL for runtime and direct migration use
- VS Code workspace opened at the project root

Setup Flow
----------
1. Clone the repository

   git clone <repository-url>
   cd <project-folder>

2. Install dependencies

   npm install

3. Create the environment file

   Create a file named `.env` in the project root.

   Add the required values:

   DATABASE_URL="your-postgresql-runtime-url"
   DIRECT_URL="your-postgresql-direct-url"
   AUTH_SECRET="your-auth-secret"
   AUTH_URL="http://localhost:3000"
   NEXT_PUBLIC_APP_NAME="Student Due Monitoring System"

   Notes:
   - `DATABASE_URL` is used at runtime by Prisma and the app.
   - `DIRECT_URL` is used by Prisma schema operations and migrations.
   - Do not commit `.env` to version control.

4. Generate the Prisma client

   npm run db:generate

5. Push the database schema

   npm run db:push

6. Seed sample data

   node prisma/seed.ts

7. Verify the app builds successfully

   npm run build

8. Start the development server

   npm run dev

9. Open the application

   Visit:

   http://localhost:3000

Troubleshooting
---------------
- If `npm install` fails, delete `node_modules` and `package-lock.json`, then run `npm install` again.
- If `prisma db push` fails with a connection or prepared statement error, confirm the URLs in `.env` and retry using the direct database connection.
- If `npm run dev` fails, inspect the terminal output for missing `.env` variables or Prisma client errors.
- If the database schema is already in sync, `npm run db:push` may report no changes.

Agent-Specific Notes
--------------------
- Ensure the agent runs commands from the project root.
- Ensure `.env` is available before running Prisma or app commands.
- Run `npm run build` after dependencies, schema push, and seed to validate the full setup.
- Do not store secrets in Git.
