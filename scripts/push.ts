import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import ws from "ws";
import * as schema from "../shared/schema";

neonConfig.webSocketConstructor = ws;

// Script to push the schema to the database using direct SQL queries
async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?"
    );
  }

  console.log("Connecting to database...");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  console.log("Creating tables...");
  try {
    // Create the tables in the right order (handle dependencies)
    
    // Tables de base
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        display_name TEXT,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        avatar TEXT,
        bio TEXT,
        role TEXT DEFAULT 'student',
        is_email_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS subjects (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        subject_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        summary TEXT,
        enhanced_content TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_reviewed TIMESTAMP,
        source_type TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS quizzes (
        id SERIAL PRIMARY KEY,
        note_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        questions JSONB NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS quiz_results (
        id SERIAL PRIMARY KEY,
        quiz_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        score INTEGER NOT NULL,
        answers JSONB NOT NULL,
        completed_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS flashcards (
        id SERIAL PRIMARY KEY,
        note_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        front TEXT NOT NULL,
        back TEXT NOT NULL,
        next_review_date TIMESTAMP,
        interval INTEGER DEFAULT 1,
        ease_factor INTEGER DEFAULT 250,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS revision_items (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        note_id INTEGER NOT NULL,
        mastery_level INTEGER DEFAULT 0,
        next_review_date TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    // Tables for profiles and preferences
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE,
        study_preferences JSONB,
        notification_settings JSONB,
        last_active TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS user_subjects (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        subject_id INTEGER NOT NULL,
        is_favorite BOOLEAN DEFAULT FALSE,
        added_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    // Tables for collaborative features
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS study_groups (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        creator_id INTEGER NOT NULL,
        is_private BOOLEAN DEFAULT FALSE,
        invite_code TEXT UNIQUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS group_members (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        role TEXT DEFAULT 'member',
        joined_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS shared_notes (
        id SERIAL PRIMARY KEY,
        note_id INTEGER NOT NULL,
        group_id INTEGER NOT NULL,
        shared_by INTEGER NOT NULL,
        permissions TEXT DEFAULT 'read',
        shared_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        note_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    // Foreign key constraints
    await db.execute(sql`
      ALTER TABLE notes ADD CONSTRAINT fk_notes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
      ALTER TABLE notes ADD CONSTRAINT fk_notes_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;
      
      ALTER TABLE quizzes ADD CONSTRAINT fk_quizzes_note FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE;
      ALTER TABLE quizzes ADD CONSTRAINT fk_quizzes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
      
      ALTER TABLE quiz_results ADD CONSTRAINT fk_quiz_results_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE;
      ALTER TABLE quiz_results ADD CONSTRAINT fk_quiz_results_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
      
      ALTER TABLE flashcards ADD CONSTRAINT fk_flashcards_note FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE;
      ALTER TABLE flashcards ADD CONSTRAINT fk_flashcards_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
      
      ALTER TABLE revision_items ADD CONSTRAINT fk_revision_items_note FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE;
      ALTER TABLE revision_items ADD CONSTRAINT fk_revision_items_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
      
      ALTER TABLE user_profiles ADD CONSTRAINT fk_user_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
      
      ALTER TABLE user_subjects ADD CONSTRAINT fk_user_subjects_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
      ALTER TABLE user_subjects ADD CONSTRAINT fk_user_subjects_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;
      
      ALTER TABLE study_groups ADD CONSTRAINT fk_study_groups_creator FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE;
      
      ALTER TABLE group_members ADD CONSTRAINT fk_group_members_group FOREIGN KEY (group_id) REFERENCES study_groups(id) ON DELETE CASCADE;
      ALTER TABLE group_members ADD CONSTRAINT fk_group_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
      
      ALTER TABLE shared_notes ADD CONSTRAINT fk_shared_notes_note FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE;
      ALTER TABLE shared_notes ADD CONSTRAINT fk_shared_notes_group FOREIGN KEY (group_id) REFERENCES study_groups(id) ON DELETE CASCADE;
      ALTER TABLE shared_notes ADD CONSTRAINT fk_shared_notes_user FOREIGN KEY (shared_by) REFERENCES users(id) ON DELETE CASCADE;
      
      ALTER TABLE comments ADD CONSTRAINT fk_comments_note FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE;
      ALTER TABLE comments ADD CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    `);
    
    // Add a few default subjects
    await db.execute(sql`
      INSERT INTO subjects (name, color)
      VALUES 
        ('Mathematics', '#3730a3'),
        ('Biologie', '#059669'),
        ('Informatique', '#7c3aed'),
        ('Histoire', '#b45309'),
        ('Physique', '#0369a1')
      ON CONFLICT (id) DO NOTHING;
    `);
    
    console.log("Schema pushed successfully!");
  } catch (error) {
    console.error("Error pushing schema:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});