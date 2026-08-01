import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import {
  users,
  notes,
  subjects,
  quizzes,
  quizResults,
  flashcards,
  revisionItems,
  userProfiles,
  studyGroups,
  groupMembers,
  sharedNotes,
  comments,
  aiConversations,
  llmSettings,
} from "@shared/schema";
import "dotenv/config";

// Configuration optimisée du pool de connexions
const poolConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306"),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "Justine@2227",
  database: process.env.DB_NAME || "smart_notes",
  waitForConnections: true,
  connectionLimit: 20, // Augmenté pour plus de connexions simultanées
  queueLimit: 10,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  multipleStatements: true,
  timezone: "+00:00",
  dateStrings: true,
  connectTimeout: 20000,
  maxIdle: 20,
  idleTimeout: 60000,
  debug: process.env.NODE_ENV === "development",
  trace: process.env.NODE_ENV === "development",
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
let poolConnection: mysql.Pool;

export const initializeDatabase = async () => {
  try {
    poolConnection = mysql.createPool(poolConfig);

    // Test initial de la connexion
    await poolConnection.query("SELECT 1");
    console.log("Connexion à la base de données établie avec succès");

    // Configuration des écouteurs d'événements
    poolConnection.on("connection", (connection) => {
      console.log("Nouvelle connexion établie");

      connection.on("error", (err) => {
        console.error("Erreur de connexion MySQL:", err);
        if (err.code === "PROTOCOL_CONNECTION_LOST") {
          console.error(
            "Connexion à la base de données perdue - Tentative de reconnexion..."
          );
          initializeDatabase().catch(console.error);
        }
      });
    });

    poolConnection.on("error", (err) => {
      console.error("Erreur du pool MySQL:", err);
      if (err.code === "POOL_ENQUEUELIMIT") {
        console.error("Limite de la file d'attente du pool atteinte");
      }
    });

    // Configuration de Drizzle avec le pool
    const db = drizzle(poolConnection, {
      schema: {
        users,
        notes,
        subjects,
        quizzes,
        quizResults,
        flashcards,
        revisionItems,
        userProfiles,
        studyGroups,
        groupMembers,
        sharedNotes,
        comments,
        aiConversations,
        llmSettings,
      },
      mode: "default",
      logger: process.env.NODE_ENV === "development",
    });

    return db;
  } catch (error) {
    console.error(
      "Erreur lors de l'initialisation de la base de données:",
      error
    );
    throw error;
  }
};

// Fonction pour vérifier la santé de la base de données
export const checkDatabaseHealth = async () => {
  if (!poolConnection) {
    return false;
  }

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
  if (!poolConnection) {
    return;
  }

  try {
    await poolConnection.end();
    console.log("Connexion à la base de données fermée avec succès");
  } catch (error) {
    console.error("Erreur lors de la fermeture de la base de données:", error);
    throw error;
  }
};

// Initialisation de la base de données et export de l'instance
export let db: ReturnType<typeof drizzle>;

export const setupDatabase = async () => {
  db = await initializeDatabase();
  return db;
};
