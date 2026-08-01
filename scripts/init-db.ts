import mysql from "mysql2/promise";

async function main() {
  // Create a connection without specifying a database
  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "Justine@2227",
  });

  try {
    // Create the database if it doesn't exist
    await connection.execute("CREATE DATABASE IF NOT EXISTS smart_notes");
    console.log("Database created or already exists");

    // Use the database
    await connection.execute("USE smart_notes");
    console.log("Database selected");
  } catch (error) {
    console.error("Error while creating the database:", error);
  } finally {
    await connection.end();
  }
}

main().catch(console.error);
