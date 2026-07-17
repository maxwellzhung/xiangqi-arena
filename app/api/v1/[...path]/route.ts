import {
  activeGameResponse,
  commandResponse,
  createGuestSession,
  disconnectResponse,
  DurableGameError,
  errorResponse,
  eventStreamResponse,
  gameListResponse,
  historyResponse,
  meResponse,
  reconnectResponse,
  reconnectTokenResponse,
} from "@/app/lib/durable-game-service.server";

export const dynamic = "force-dynamic";

async function jsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new DurableGameError(
      400,
      "INVALID_JSON",
      "The request body must be valid JSON.",
    );
  }
}

function pathParts(request: Request): string[] {
  const prefix = "/api/v1/";
  const pathname = new URL(request.url).pathname;
  if (!pathname.startsWith(prefix)) return [];
  return pathname
    .slice(prefix.length)
    .split("/")
    .filter(Boolean)
    .map(decodeURIComponent);
}

async function dispatch(request: Request): Promise<Response> {
  const path = pathParts(request);
  const method = request.method.toUpperCase();

  if (method === "POST" && path.length === 1 && path[0] === "guest-sessions") {
    return createGuestSession(request, await jsonBody(request));
  }
  if (method === "GET" && path.length === 1 && path[0] === "me") {
    return meResponse(request);
  }
  if (method === "GET" && path.length === 1 && path[0] === "active-game") {
    return activeGameResponse(request);
  }
  if (method === "POST" && path.length === 1 && path[0] === "commands") {
    return commandResponse(request, await jsonBody(request));
  }
  if (method === "GET" && path.length === 1 && path[0] === "events") {
    return eventStreamResponse(request);
  }
  if (method === "GET" && path.length === 1 && path[0] === "games") {
    return gameListResponse(request);
  }
  if (method === "POST" && path.length === 1 && path[0] === "reconnect-token") {
    return reconnectTokenResponse(request, await jsonBody(request));
  }
  if (method === "POST" && path.length === 1 && path[0] === "reconnect") {
    return reconnectResponse(request, await jsonBody(request));
  }
  if (method === "POST" && path.length === 1 && path[0] === "disconnect") {
    return disconnectResponse(request, await jsonBody(request));
  }
  if (method === "GET" && path.length === 2 && path[0] === "games") {
    return historyResponse(request, path[1]);
  }
  throw new DurableGameError(
    404,
    "ROUTE_NOT_FOUND",
    "That game-service route does not exist.",
  );
}

async function handle(request: Request): Promise<Response> {
  try {
    return await dispatch(request);
  } catch (error) {
    return errorResponse(error);
  }
}

export const GET = handle;
export const POST = handle;

export function OPTIONS(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      allow: "GET, POST, OPTIONS",
      "cache-control": "no-store",
    },
  });
}
