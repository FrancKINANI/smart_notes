import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./shared/schema.ts",
  out: "./migrations",
  dialect: "mysql",
  dbCredentials: {
    host: "localhost",
    user: "root",
    password: "Justine@2227",
    database: "smart_notes",
  },
});
