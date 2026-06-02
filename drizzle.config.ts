import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql", // We are using PostgreSQL
  schema: "./db/schema.ts",
  out: "./drizzle", // Where drizzle will save its migration SQL scripts
  dbCredentials: {
    // Looks for a DATABASE_URL variable in your environment, or falls back to your local setup
    url: process.env.DATABASE_URL || "postgresql://postgres:root@127.0.0.1:5432/blog_platform",
  },
});