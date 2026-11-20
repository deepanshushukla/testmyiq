import { config } from "dotenv";

// Must run before any test module imports lib/db/client, so the Prisma
// singleton is constructed against the test database, not dev data.
config({ path: ".env.test", override: true });

import "@testing-library/jest-dom/vitest";
