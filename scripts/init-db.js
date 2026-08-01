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
    console.log("Database created successfully");

    await connection.query("USE smart_notes");
    console.log("Database selected");
  } catch (error) {
    console.error("Error while creating the database:", error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main();
