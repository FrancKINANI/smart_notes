CREATE TABLE `comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`note_id` int NOT NULL,
	`user_id` int NOT NULL,
	`content` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `flashcards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`note_id` int NOT NULL,
	`user_id` int NOT NULL,
	`front` text NOT NULL,
	`back` text NOT NULL,
	`next_review_date` timestamp,
	`interval` int DEFAULT 1,
	`ease_factor` int DEFAULT 250,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `flashcards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `group_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`group_id` int NOT NULL,
	`user_id` int NOT NULL,
	`role` varchar(50) DEFAULT 'member',
	`joined_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `group_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`subject_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`summary` text,
	`enhanced_content` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`last_reviewed` timestamp,
	`source_type` varchar(50) NOT NULL,
	CONSTRAINT `notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quiz_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quiz_id` int NOT NULL,
	`user_id` int NOT NULL,
	`score` int NOT NULL,
	`answers` json NOT NULL,
	`completed_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quiz_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quizzes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`note_id` int NOT NULL,
	`user_id` int NOT NULL,
	`questions` json NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quizzes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `revision_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`note_id` int NOT NULL,
	`mastery_level` int DEFAULT 0,
	`next_review_date` timestamp,
	CONSTRAINT `revision_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shared_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`note_id` int NOT NULL,
	`group_id` int NOT NULL,
	`shared_by` int NOT NULL,
	`shared_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shared_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `study_groups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`owner_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `study_groups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`color` varchar(50) NOT NULL,
	CONSTRAINT `subjects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`study_preferences` json,
	`notification_settings` json,
	`last_active` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_profiles_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `user_subjects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`subject_id` int NOT NULL,
	`is_favorite` boolean DEFAULT false,
	`added_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_subjects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password` varchar(255) NOT NULL,
	`display_name` varchar(255),
	`first_name` varchar(100),
	`last_name` varchar(100),
	`avatar` varchar(255),
	`bio` text,
	`role` varchar(50) DEFAULT 'student',
	`is_email_verified` boolean DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
