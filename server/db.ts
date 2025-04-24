import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "@shared/schema";

const poolConnection = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "Justine@2227",
  database: "smart_notes",
});

export const db = drizzle(poolConnection, { schema, mode: "default" });
