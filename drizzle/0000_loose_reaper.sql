CREATE TABLE `command_deduplication` (
	`command_id` text PRIMARY KEY NOT NULL,
	`game_id` text,
	`player_id` text NOT NULL,
	`command_type` text NOT NULL,
	`stored_response` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `command_deduplication_game_idx` ON `command_deduplication` (`game_id`);--> statement-breakpoint
CREATE INDEX `command_deduplication_created_idx` ON `command_deduplication` (`created_at`);--> statement-breakpoint
CREATE TABLE `game_connections` (
	`game_id` text NOT NULL,
	`player_id` text NOT NULL,
	`reconnect_token_hash` text NOT NULL,
	`connected` integer DEFAULT false NOT NULL,
	`last_seen_at` integer NOT NULL,
	`grace_ends_at` integer,
	PRIMARY KEY(`game_id`, `player_id`),
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `game_connections_token_unique` ON `game_connections` (`reconnect_token_hash`);--> statement-breakpoint
CREATE INDEX `game_connections_grace_idx` ON `game_connections` (`connected`,`grace_ends_at`);--> statement-breakpoint
CREATE TABLE `games` (
	`id` text PRIMARY KEY NOT NULL,
	`room_type` text NOT NULL,
	`rated` integer DEFAULT false NOT NULL,
	`time_control_id` text NOT NULL,
	`initial_ms` integer NOT NULL,
	`increment_ms` integer DEFAULT 0 NOT NULL,
	`red_player_id` text NOT NULL,
	`black_player_id` text NOT NULL,
	`initial_position` text NOT NULL,
	`current_position` text NOT NULL,
	`position_hash` text NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`move_sequence` integer DEFAULT 0 NOT NULL,
	`current_turn` text DEFAULT 'red' NOT NULL,
	`red_time_ms` integer NOT NULL,
	`black_time_ms` integer NOT NULL,
	`clock_running` text,
	`clock_measured_at` integer NOT NULL,
	`status` text DEFAULT 'waiting' NOT NULL,
	`result` text,
	`termination_reason` text,
	`completion_token` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`started_at` text,
	`ended_at` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`red_player_id`) REFERENCES `players`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`black_player_id`) REFERENCES `players`(`id`) ON UPDATE cascade ON DELETE restrict,
	CONSTRAINT "games_players_distinct_check" CHECK("games"."red_player_id" <> "games"."black_player_id"),
	CONSTRAINT "games_initial_ms_check" CHECK("games"."initial_ms" > 0),
	CONSTRAINT "games_increment_ms_check" CHECK("games"."increment_ms" >= 0),
	CONSTRAINT "games_version_check" CHECK("games"."version" >= 0),
	CONSTRAINT "games_move_sequence_check" CHECK("games"."move_sequence" >= 0),
	CONSTRAINT "games_red_time_check" CHECK("games"."red_time_ms" >= 0),
	CONSTRAINT "games_black_time_check" CHECK("games"."black_time_ms" >= 0),
	CONSTRAINT "games_turn_check" CHECK("games"."current_turn" IN ('red', 'black')),
	CONSTRAINT "games_completion_shape_check" CHECK(("games"."status" = 'completed' AND "games"."result" IS NOT NULL AND "games"."termination_reason" IS NOT NULL AND "games"."ended_at" IS NOT NULL) OR ("games"."status" <> 'completed' AND "games"."result" IS NULL AND "games"."termination_reason" IS NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `games_completion_token_unique` ON `games` (`completion_token`);--> statement-breakpoint
CREATE INDEX `games_status_created_idx` ON `games` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `games_red_player_created_idx` ON `games` (`red_player_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `games_black_player_created_idx` ON `games` (`black_player_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `games_rated_status_idx` ON `games` (`rated`,`status`);--> statement-breakpoint
CREATE TABLE `guest_identities` (
	`player_id` text PRIMARY KEY NOT NULL,
	`signed_token_ref` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_active_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `guest_identities_token_ref_unique` ON `guest_identities` (`signed_token_ref`);--> statement-breakpoint
CREATE TABLE `matchmaking_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`player_id` text NOT NULL,
	`time_control_id` text NOT NULL,
	`rated` integer DEFAULT false NOT NULL,
	`rating` integer DEFAULT 1200 NOT NULL,
	`status` text DEFAULT 'waiting' NOT NULL,
	`joined_at` integer NOT NULL,
	`last_heartbeat_at` integer NOT NULL,
	`matched_game_id` text,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`matched_game_id`) REFERENCES `games`(`id`) ON UPDATE cascade ON DELETE set null,
	CONSTRAINT "matchmaking_rating_check" CHECK("matchmaking_entries"."rating" >= 0)
);
--> statement-breakpoint
CREATE INDEX `matchmaking_queue_idx` ON `matchmaking_entries` (`status`,`time_control_id`,`rated`,`joined_at`);--> statement-breakpoint
CREATE INDEX `matchmaking_player_status_idx` ON `matchmaking_entries` (`player_id`,`status`);--> statement-breakpoint
CREATE TABLE `moves` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`moving_color` text NOT NULL,
	`from_column` integer NOT NULL,
	`from_row` integer NOT NULL,
	`to_column` integer NOT NULL,
	`to_row` integer NOT NULL,
	`captured_piece` text,
	`position_after` text NOT NULL,
	`position_hash` text NOT NULL,
	`red_time_ms` integer NOT NULL,
	`black_time_ms` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT "moves_sequence_check" CHECK("moves"."sequence" > 0),
	CONSTRAINT "moves_from_column_check" CHECK("moves"."from_column" BETWEEN 0 AND 8),
	CONSTRAINT "moves_to_column_check" CHECK("moves"."to_column" BETWEEN 0 AND 8),
	CONSTRAINT "moves_from_row_check" CHECK("moves"."from_row" BETWEEN 0 AND 9),
	CONSTRAINT "moves_to_row_check" CHECK("moves"."to_row" BETWEEN 0 AND 9),
	CONSTRAINT "moves_red_time_check" CHECK("moves"."red_time_ms" >= 0),
	CONSTRAINT "moves_black_time_check" CHECK("moves"."black_time_ms" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `moves_game_sequence_unique` ON `moves` (`game_id`,`sequence`);--> statement-breakpoint
CREATE INDEX `moves_game_created_idx` ON `moves` (`game_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `player_ratings` (
	`player_id` text NOT NULL,
	`game_mode` text NOT NULL,
	`rating` integer DEFAULT 1200 NOT NULL,
	`games_played` integer DEFAULT 0 NOT NULL,
	`wins` integer DEFAULT 0 NOT NULL,
	`losses` integer DEFAULT 0 NOT NULL,
	`draws` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`player_id`, `game_mode`),
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT "player_ratings_rating_check" CHECK("player_ratings"."rating" >= 0),
	CONSTRAINT "player_ratings_totals_check" CHECK("player_ratings"."games_played" >= 0 AND "player_ratings"."wins" >= 0 AND "player_ratings"."losses" >= 0 AND "player_ratings"."draws" >= 0 AND "player_ratings"."games_played" = "player_ratings"."wins" + "player_ratings"."losses" + "player_ratings"."draws")
);
--> statement-breakpoint
CREATE INDEX `player_ratings_leaderboard_idx` ON `player_ratings` (`game_mode`,`rating`);--> statement-breakpoint
CREATE TABLE `players` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "players_kind_check" CHECK("players"."kind" IN ('user', 'guest')),
	CONSTRAINT "players_status_check" CHECK("players"."status" IN ('active', 'suspended', 'deleted'))
);
--> statement-breakpoint
CREATE INDEX `players_status_idx` ON `players` (`status`);--> statement-breakpoint
CREATE TABLE `private_rooms` (
	`code` text PRIMARY KEY NOT NULL,
	`owner_player_id` text NOT NULL,
	`game_id` text,
	`time_control_id` text NOT NULL,
	`status` text DEFAULT 'waiting' NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`owner_player_id`) REFERENCES `players`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE cascade ON DELETE set null,
	CONSTRAINT "private_rooms_code_check" CHECK(length("private_rooms"."code") = 6)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `private_rooms_game_unique` ON `private_rooms` (`game_id`);--> statement-breakpoint
CREATE INDEX `private_rooms_owner_status_idx` ON `private_rooms` (`owner_player_id`,`status`);--> statement-breakpoint
CREATE INDEX `private_rooms_expiry_idx` ON `private_rooms` (`status`,`expires_at`);--> statement-breakpoint
CREATE TABLE `rating_history` (
	`id` text PRIMARY KEY NOT NULL,
	`player_id` text NOT NULL,
	`game_id` text NOT NULL,
	`game_mode` text NOT NULL,
	`previous_rating` integer NOT NULL,
	`new_rating` integer NOT NULL,
	`rating_change` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE cascade ON DELETE restrict,
	CONSTRAINT "rating_history_change_check" CHECK("rating_history"."new_rating" = "rating_history"."previous_rating" + "rating_history"."rating_change")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rating_history_player_game_mode_unique` ON `rating_history` (`player_id`,`game_id`,`game_mode`);--> statement-breakpoint
CREATE INDEX `rating_history_game_idx` ON `rating_history` (`game_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`player_id` text PRIMARY KEY NOT NULL,
	`email` text,
	`external_account_ref` text,
	`username` text NOT NULL,
	`display_name` text NOT NULL,
	`account_status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT "users_account_status_check" CHECK("users"."account_status" IN ('active', 'suspended', 'pending-deletion')),
	CONSTRAINT "users_login_identifier_check" CHECK("users"."email" IS NOT NULL OR "users"."external_account_ref" IS NOT NULL)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_external_account_ref_unique` ON `users` (`external_account_ref`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE INDEX `users_display_name_idx` ON `users` (`display_name`);