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
    // Lecture des fichiers SQL dans le dossier migrations
    const migrationFiles = await fs.readdir(
      path.join(process.cwd(), "migrations")
    );
    const sqlFiles = migrationFiles
      .filter((file) => file.endsWith(".sql"))
      .sort(); // Tri pour assurer l'ordre d'exécution

    // Exécution de chaque fichier de migration
    for (const file of sqlFiles) {
      console.log(`Exécution de la migration: ${file}`);
      try {
        const sql = await fs.readFile(
          path.join(process.cwd(), "migrations", file),
          "utf8"
        );

        // Séparation des instructions SQL par le séparateur de migration
        const statements = sql
          .split("-- statement-breakpoint")
          .map((stmt) => stmt.trim())
          .filter((stmt) => stmt.length > 0);

        // Exécution de chaque instruction séparément
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
            console.log(`Info: Table déjà existante, continuation...`);
          }
        }

        console.log(`Migration ${file} exécutée avec succès`);
      } catch (fileError) {
        console.error(`Erreur lors de l'exécution de ${file}:`, fileError);
        throw fileError;
      }
    }

    console.log("Toutes les migrations ont été exécutées avec succès");
  } catch (error) {
    console.error("Erreur lors des migrations:", error);
    process.exit(1);
  } finally {
    await poolConnection.end();
  }
}

migrate();
