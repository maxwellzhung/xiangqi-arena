import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const migrations = [
  "drizzle/0000_loose_reaper.sql",
  "drizzle/0001_parallel_silverclaw.sql",
  "drizzle/0002_damp_deathbird.sql",
];

function database() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const migration of migrations) {
    db.exec(
      readFileSync(migration, "utf8").replaceAll(
        "--> statement-breakpoint",
        "",
      ),
    );
  }
  return db;
}

function seedGame(db) {
  db.exec(`
    INSERT INTO players(id, kind, status) VALUES ('red', 'guest', 'active');
    INSERT INTO players(id, kind, status) VALUES ('black', 'guest', 'active');
    INSERT INTO guest_identities(player_id, signed_token_ref) VALUES ('red', 'red-token');
    INSERT INTO guest_identities(player_id, signed_token_ref) VALUES ('black', 'black-token');
    INSERT INTO games(
      id, room_type, rated, time_control_id, initial_ms, increment_ms,
      red_player_id, black_player_id, initial_position, current_position,
      position_hash, version, move_sequence, current_turn, red_time_ms,
      black_time_ms, clock_running, clock_measured_at, status, started_at
    ) VALUES (
      'game-1234', 'private', 0, 'rapid-10', 600000, 0,
      'red', 'black', 'position', 'position', 'hash', 0, 0, 'red',
      600000, 600000, 'red', 1000, 'active', CURRENT_TIMESTAMP
    );
  `);
}

test("durable migration applies cleanly with its concurrency triggers", () => {
  const db = database();
  assert.equal(
    db
      .prepare(
        "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
      )
      .get().count,
    20,
  );
  assert.deepEqual(
    db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'trigger' ORDER BY name",
      )
      .all()
      .map((row) => row.name),
    [
      "durable_game_command_version_guard",
      "durable_matchmaking_claim_guard",
      "durable_room_claim_guard",
    ],
  );
  assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
});

test("a stale game command is rejected at the database boundary", () => {
  const db = database();
  seedGame(db);
  db.exec(`
    INSERT INTO command_deduplication(command_id, game_id, player_id, command_type, stored_response)
    VALUES ('fresh', 'game-1234', 'red', 'submitMove', '{}');
    INSERT INTO durable_game_command_guards(command_id, game_id, expected_version)
    VALUES ('fresh', 'game-1234', 0);
  `);
  db.exec(`
    INSERT INTO command_deduplication(command_id, game_id, player_id, command_type, stored_response)
    VALUES ('stale', 'game-1234', 'red', 'submitMove', '{}');
  `);
  assert.throws(
    () =>
      db.exec(`
        INSERT INTO durable_game_command_guards(command_id, game_id, expected_version)
        VALUES ('stale', 'game-1234', 1);
      `),
    /VERSION_OR_AUTH_CONFLICT/,
  );
});

test("expired rooms and non-waiting queue entries cannot be claimed", () => {
  const db = database();
  seedGame(db);
  db.exec(`
    INSERT INTO private_rooms(code, owner_player_id, game_id, time_control_id, status, expires_at)
    VALUES ('ABC234', 'red', NULL, 'rapid-10', 'waiting', 1);
  `);
  assert.throws(
    () =>
      db.exec(`
        INSERT INTO durable_room_claims(room_code, game_id, joining_player_id)
        VALUES ('ABC234', 'game-1234', 'black');
      `),
    /ROOM_UNAVAILABLE/,
  );

  db.exec(`
    INSERT INTO matchmaking_entries(
      id, player_id, time_control_id, rated, rating, status,
      joined_at, last_heartbeat_at, matched_game_id
    ) VALUES ('entry-1', 'red', 'rapid-10', 0, 1500, 'matched', 1, 1, 'game-1234');
  `);
  assert.throws(
    () =>
      db.exec(`
        INSERT INTO durable_matchmaking_claims(entry_id, game_id)
        VALUES ('entry-1', 'game-1234');
      `),
    /MATCH_ENTRY_UNAVAILABLE/,
  );
});
