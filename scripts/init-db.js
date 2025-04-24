import mysql from "mysql2/promise";

const dbConfig = {
  host: "localhost",
  user: "root",
  password: "Justine@2227",
};

async function main() {
  const connection = await mysql.createConnection(dbConfig);

  try {
    await connection.query("CREATE DATABASE IF NOT EXISTS smart_notes");
    console.log("Base de données créée avec succès");

    await connection.query("USE smart_notes");
    console.log("Base de données sélectionnée");
  } catch (error) {
    console.error("Erreur lors de la création de la base de données:", error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main();
