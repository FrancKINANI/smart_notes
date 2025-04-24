import mysql from "mysql2/promise";

async function main() {
  // Créer une connexion sans spécifier de base de données
  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "Justine@2227",
  });

  try {
    // Créer la base de données si elle n'existe pas
    await connection.execute("CREATE DATABASE IF NOT EXISTS smart_notes");
    console.log("Base de données créée ou déjà existante");

    // Utiliser la base de données
    await connection.execute("USE smart_notes");
    console.log("Base de données sélectionnée");
  } catch (error) {
    console.error("Erreur lors de la création de la base de données:", error);
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
