import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

if (!process.env.AMPAG_DATABASE_URL) {
  throw new Error("AMPAG_DATABASE_URL is not defined. Please set it in your .env file.");
}

const sql = neon(process.env.AMPAG_DATABASE_URL);
export const db = drizzle(sql, { schema });
