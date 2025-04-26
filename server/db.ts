import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "@shared/schema";
import "dotenv/config";

// Configuration optimisée du pool de connexions
const poolConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306"),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "Justine@2227",
  database: process.env.DB_NAME || "smart_notes",
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || "10"),
  queueLimit: parseInt(process.env.DB_QUEUE_LIMIT || "0"),
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  multipleStatements: true,
  timezone: "+00:00",
  dateStrings: true,
  connectTimeout: 10000,
  maxIdle: 10,
  idleTimeout: 60000,
  debug: process.env.NODE_ENV === "development",
  trace: false,
  // Ajout des options spécifiques pour MySQL 9.2
  ssl:
    process.env.DB_SSL === "true"
      ? {
          rejectUnauthorized: false,
        }
      : undefined,
  authPlugins: {
    mysql_native_password: () => () => Buffer.from([0]),
  },
};

// Création du pool avec gestion des erreurs
const poolConnection = mysql.createPool(poolConfig);

// Gestion des événements du pool
poolConnection.on("connection", (connection) => {
  console.log("Nouvelle connexion établie");

  connection.on("error", (err) => {
    console.error("Erreur de connexion MySQL:", err);
    if (err.code === "PROTOCOL_CONNECTION_LOST") {
      console.error("Connexion à la base de données perdue");
    }
  });
});

// Remplace l'écouteur d'événements incorrect
poolConnection.on("enqueue", (err) => {
  console.error("Erreur du pool MySQL:", err);
  if (err?.code === "POOL_ENQUEUELIMIT") {
    console.error("Limite de la file d'attente du pool atteinte");
  }
});

// Configuration de Drizzle avec le pool
export const db = drizzle(poolConnection, {
  schema,
  mode: "default",
  logger: process.env.NODE_ENV === "development",
});

// Fonction pour vérifier la santé de la base de données
export const checkDatabaseHealth = async () => {
  try {
    await poolConnection.query("SELECT 1");
    return true;
  } catch (error) {
    console.error(
      "Erreur lors de la vérification de la santé de la base de données:",
      error
    );
    return false;
  }
};

// Fonction pour fermer proprement le pool
export const closeDatabase = async () => {
  try {
    await poolConnection.end();
    console.log("Connexion à la base de données fermée avec succès");
  } catch (error) {
    console.error("Erreur lors de la fermeture de la base de données:", error);
    throw error;
  }
};
