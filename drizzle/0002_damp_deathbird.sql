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
--> statement-breakpoint
CREATE TRIGGER `durable_game_command_version_guard`
BEFORE INSERT ON `durable_game_command_guards`
FOR EACH ROW
WHEN NOT EXISTS (
	SELECT 1
	FROM `games` g
	JOIN `command_deduplication` c ON c.`command_id` = NEW.`command_id`
	WHERE g.`id` = NEW.`game_id`
		AND g.`version` = NEW.`expected_version`
		AND c.`game_id` = g.`id`
		AND c.`player_id` IN (g.`red_player_id`, g.`black_player_id`)
)
BEGIN
	SELECT RAISE(ABORT, 'VERSION_OR_AUTH_CONFLICT');
END;
--> statement-breakpoint
CREATE TRIGGER `durable_room_claim_guard`
BEFORE INSERT ON `durable_room_claims`
FOR EACH ROW
WHEN NOT EXISTS (
	SELECT 1 FROM `private_rooms` pr
	WHERE pr.`code` = NEW.`room_code`
		AND pr.`status` = 'waiting'
		AND pr.`expires_at` > CAST(strftime('%s', 'now') AS INTEGER) * 1000
)
BEGIN
	SELECT RAISE(ABORT, 'ROOM_UNAVAILABLE');
END;
--> statement-breakpoint
CREATE TRIGGER `durable_matchmaking_claim_guard`
BEFORE INSERT ON `durable_matchmaking_claims`
FOR EACH ROW
WHEN NOT EXISTS (
	SELECT 1 FROM `matchmaking_entries` me
	WHERE me.`id` = NEW.`entry_id` AND me.`status` = 'waiting'
)
BEGIN
	SELECT RAISE(ABORT, 'MATCH_ENTRY_UNAVAILABLE');
END;
