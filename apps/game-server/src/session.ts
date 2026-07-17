import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { PublicError } from "./errors.js";
import type { IdentityRepository } from "./repository.js";
import type { PlayerIdentity, PlayerKind } from "./types.js";
import { sanitizeDisplayName } from "./authorization.js";

const claimsSchema = z
  .object({
    sub: z.string().uuid(),
    kind: z.enum(["user", "guest"]),
    exp: z.number().int().positive(),
  })
  .strict();

interface SessionClaims {
  sub: string;
  kind: PlayerKind;
  exp: number;
}

function encode(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function decode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

export class SessionService {
  constructor(
    private readonly identities: IdentityRepository,
    private readonly secret: string,
    private readonly ttlMs = 30 * 24 * 60 * 60 * 1_000,
    private readonly now = () => Date.now(),
  ) {
    if (Buffer.byteLength(secret) < 32) {
      throw new Error("SESSION_SECRET must contain at least 32 bytes");
    }
  }

  private signature(payload: string): Buffer {
    return createHmac("sha256", this.secret).update(payload).digest();
  }

  private token(claims: SessionClaims): string {
    const payload = encode(JSON.stringify(claims));
    return `${payload}.${this.signature(payload).toString("base64url")}`;
  }

  async createGuest(
    displayName: string,
  ): Promise<{ identity: PlayerIdentity; token: string }> {
    const identity: PlayerIdentity = {
      id: randomUUID(),
      kind: "guest",
      displayName: sanitizeDisplayName(displayName),
      rating: 1200,
    };
    await this.identities.save(identity);
    return {
      identity,
      token: this.token({
        sub: identity.id,
        kind: identity.kind,
        exp: this.now() + this.ttlMs,
      }),
    };
  }

  async authenticate(
    authorization: string | undefined,
  ): Promise<PlayerIdentity> {
    if (!authorization?.startsWith("Bearer ")) {
      throw new PublicError(
        "UNAUTHENTICATED",
        "A valid player session is required.",
        401,
      );
    }
    const token = authorization.slice("Bearer ".length);
    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra) {
      throw new PublicError(
        "INVALID_SESSION",
        "The player session is invalid.",
        401,
      );
    }

    const expected = this.signature(payload);
    let supplied: Buffer;
    try {
      supplied = Buffer.from(signature, "base64url");
    } catch {
      throw new PublicError(
        "INVALID_SESSION",
        "The player session is invalid.",
        401,
      );
    }
    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    ) {
      throw new PublicError(
        "INVALID_SESSION",
        "The player session is invalid.",
        401,
      );
    }

    let claims: z.infer<typeof claimsSchema>;
    try {
      claims = claimsSchema.parse(JSON.parse(decode(payload)));
    } catch {
      throw new PublicError(
        "INVALID_SESSION",
        "The player session is invalid.",
        401,
      );
    }
    if (claims.exp <= this.now()) {
      throw new PublicError(
        "SESSION_EXPIRED",
        "The player session has expired.",
        401,
      );
    }
    const identity = await this.identities.get(claims.sub);
    if (!identity || identity.kind !== claims.kind) {
      throw new PublicError(
        "INVALID_SESSION",
        "The player session is invalid.",
        401,
      );
    }
    return identity;
  }
}
