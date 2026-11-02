import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

function url(): string {
  const u = process.env.DATABASE_URL;
  if (!u) throw new Error("DATABASE_URL is not set");
  return u;
}

// neon-http is stateless per query, which suits Fluid Compute; no pooling needed.
export const db = drizzle(neon(url()), { schema });
export { schema };
