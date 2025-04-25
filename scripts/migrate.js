import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { db } from "../server/db.js";
import fs from "fs/promises";
import path from "path";

const poolConnection = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "Justine@2227",
  database: "smart_notes",
});

const db = drizzle(poolConnection);

async function migrate() {
  try {
    // Read all SQL files from migrations directory
    const migrationFiles = await fs.readdir("./migrations");
    const sqlFiles = migrationFiles
      .filter((file) => file.endsWith(".sql"))
      .sort();

    // Execute each migration file
    for (const file of sqlFiles) {
      console.log(`Running migration: ${file}`);
      const sql = await fs.readFile(path.join("./migrations", file), "utf-8");
      await db.execute(sql);
    }

    console.log("Migrations completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await poolConnection.end();
  }
}

migrate();
