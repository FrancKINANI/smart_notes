import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import fs from "fs/promises";
import path from "path";
import "dotenv/config";

async function migrate() {
  const poolConnection = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "smart_notes",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  try {
    // Read SQL files in the migrations folder
    const migrationFiles = await fs.readdir(
      path.join(process.cwd(), "migrations")
    );
    const sqlFiles = migrationFiles
      .filter((file) => file.endsWith(".sql"))
      .sort(); // Sort to ensure execution order

    // Execute each migration file
    for (const file of sqlFiles) {
      console.log(`Running migration: ${file}`);
      try {
        const sql = await fs.readFile(
          path.join(process.cwd(), "migrations", file),
          "utf8"
        );

        // Split SQL statements by the migration separator
        const statements = sql
          .split("-- statement-breakpoint")
          .map((stmt) => stmt.trim())
          .filter((stmt) => stmt.length > 0);

        // Execute each statement separately
        for (const statement of statements) {
          try {
            await poolConnection.query(statement);
          } catch (stmtError) {
            if (
              !(stmtError instanceof Error) ||
              !stmtError.message.includes("Table") ||
              !stmtError.message.includes("already exists")
            ) {
              throw stmtError;
            }
            console.log(`Info: Table already exists, continuing...`);
          }
        }

        console.log(`Migration ${file} executed successfully`);
      } catch (fileError) {
        console.error(`Error while executing ${file}:`, fileError);
        throw fileError;
      }
    }

    console.log("All migrations executed successfully");
  } catch (error) {
    console.error("Error during migrations:", error);
    process.exit(1);
  } finally {
    await poolConnection.end();
  }
}

migrate();
