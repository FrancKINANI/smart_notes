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

// Optimized connection pool configuration
const poolConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306"),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "Justine@2227",
  database: process.env.DB_NAME || "smart_notes",
  waitForConnections: true,
  connectionLimit: 20, // Increased for more simultaneous connections
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

// Create the pool with error handling
let poolConnection: mysql.Pool;

export const initializeDatabase = async () => {
  try {
    poolConnection = mysql.createPool(poolConfig);

    // Initial connection test
    await poolConnection.query("SELECT 1");
    console.log("Database connection established successfully");

    // Configure event listeners
    poolConnection.on("connection", (connection) => {
      console.log("New connection established");

      connection.on("error", (err) => {
        console.error("MySQL connection error:", err);
        if (err.code === "PROTOCOL_CONNECTION_LOST") {
          console.error(
            "Database connection lost - Attempting to reconnect..."
          );
          initializeDatabase().catch(console.error);
        }
      });
    });

    poolConnection.on("error", (err) => {
      console.error("MySQL pool error:", err);
      if (err.code === "POOL_ENQUEUELIMIT") {
        console.error("Pool queue limit reached");
      }
    });

    // Configure Drizzle with the pool
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
    console.error("Error while initializing the database:", error);
    throw error;
  }
};

// Function to check the database health
export const checkDatabaseHealth = async () => {
  if (!poolConnection) {
    return false;
  }

  try {
    await poolConnection.query("SELECT 1");
    return true;
  } catch (error) {
    console.error("Error while checking database health:", error);
    return false;
  }
};

// Function to close the pool cleanly
export const closeDatabase = async () => {
  if (!poolConnection) {
    return;
  }

  try {
    await poolConnection.end();
    console.log("Database connection closed successfully");
  } catch (error) {
    console.error("Error while closing the database:", error);
    throw error;
  }
};

// Initialize the database and export the instance
export let db: ReturnType<typeof drizzle>;

export const setupDatabase = async () => {
  db = await initializeDatabase();
  return db;
};
