CREATE TABLE `game_completions` (
	`game_id` text PRIMARY KEY NOT NULL,
	`completion_token` text NOT NULL,
	`result` text NOT NULL,
	`termination_reason` text NOT NULL,
	`completed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`ratings_processed_at` text,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `game_completions_token_unique` ON `game_completions` (`completion_token`);--> statement-breakpoint
CREATE INDEX `game_completions_completed_idx` ON `game_completions` (`completed_at`);