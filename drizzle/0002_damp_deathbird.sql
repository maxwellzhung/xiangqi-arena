CREATE TABLE `durable_game_command_guards` (
	`command_id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`expected_version` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`command_id`) REFERENCES `command_deduplication`(`command_id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT "durable_game_command_guards_version_check" CHECK("durable_game_command_guards"."expected_version" >= 0)
);
--> statement-breakpoint
CREATE INDEX `durable_game_command_guards_game_idx` ON `durable_game_command_guards` (`game_id`);--> statement-breakpoint
CREATE TABLE `durable_game_negotiations` (
	`game_id` text PRIMARY KEY NOT NULL,
	`draw_offered_by` text,
	`rematch_requested_by` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT "durable_game_negotiations_draw_check" CHECK("durable_game_negotiations"."draw_offered_by" IS NULL OR "durable_game_negotiations"."draw_offered_by" IN ('red', 'black')),
	CONSTRAINT "durable_game_negotiations_rematch_check" CHECK("durable_game_negotiations"."rematch_requested_by" IS NULL OR "durable_game_negotiations"."rematch_requested_by" IN ('red', 'black'))
);
--> statement-breakpoint
CREATE TABLE `durable_guest_profiles` (
	`player_id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `guest_identities`(`player_id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `durable_matchmaking_claims` (
	`entry_id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `matchmaking_entries`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `durable_matchmaking_claims_game_idx` ON `durable_matchmaking_claims` (`game_id`);--> statement-breakpoint
CREATE TABLE `durable_matchmaking_presence` (
	`player_id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`entry_id`) REFERENCES `matchmaking_entries`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `durable_matchmaking_presence_entry_unique` ON `durable_matchmaking_presence` (`entry_id`);--> statement-breakpoint
CREATE TABLE `durable_player_events` (
	`id` text PRIMARY KEY NOT NULL,
	`player_id` text NOT NULL,
	`game_id` text,
	`payload` text NOT NULL,
	`delivered_at` integer,
	`created_at_ms` integer NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `durable_player_events_pending_idx` ON `durable_player_events` (`player_id`,`delivered_at`,`created_at_ms`);--> statement-breakpoint
CREATE INDEX `durable_player_events_game_idx` ON `durable_player_events` (`game_id`,`created_at_ms`);--> statement-breakpoint
CREATE TABLE `durable_rematches` (
	`source_game_id` text PRIMARY KEY NOT NULL,
	`rematch_game_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`source_game_id`) REFERENCES `games`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`rematch_game_id`) REFERENCES `games`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `durable_rematches_game_unique` ON `durable_rematches` (`rematch_game_id`);--> statement-breakpoint
CREATE TABLE `durable_room_claims` (
	`room_code` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`joining_player_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`room_code`) REFERENCES `private_rooms`(`code`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`joining_player_id`) REFERENCES `players`(`id`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `durable_room_claims_game_unique` ON `durable_room_claims` (`game_id`);